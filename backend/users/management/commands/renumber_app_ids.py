from collections import defaultdict

from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from django.core.management import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connection, transaction
from django.db.models import AutoField, BigAutoField, SmallAutoField


TARGET_APP_LABELS = {"admin", "dashboard", "learning_plans", "userr", "users"}


class Command(BaseCommand):
    help = "Renumber application primary keys from 1 and update their references."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply the renumbering. Without this flag, only show the plan.",
        )

    def handle(self, *args, **options):
        models = self._target_models()
        mappings = self._build_mappings(models)
        changed = {
            table: mapping
            for table, mapping in mappings.items()
            if any(old_id != new_id for old_id, new_id in mapping.items())
        }

        if not changed:
            self.stdout.write(self.style.SUCCESS("All application IDs already start at 1."))
            return

        references = self._foreign_key_references(set(changed))
        self._ensure_references_are_deferrable(set(changed))
        self._show_plan(models, mappings)

        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING("Dry run only. Run again with --apply to continue.")
            )
            return

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SET CONSTRAINTS ALL DEFERRED")

                temporary_mappings = {
                    table: {
                        old_id: -position
                        for position, old_id in enumerate(mapping, start=1)
                    }
                    for table, mapping in changed.items()
                }

                self._apply_phase(cursor, temporary_mappings, references, models)

                final_mappings = {
                    table: {
                        temporary_mappings[table][old_id]: new_id
                        for old_id, new_id in mapping.items()
                    }
                    for table, mapping in changed.items()
                }
                self._apply_phase(cursor, final_mappings, references, models)

                cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")

            sequence_sql = connection.ops.sequence_reset_sql(no_style(), models)
            with connection.cursor() as cursor:
                for statement in sequence_sql:
                    cursor.execute(statement)

        self._verify(models)
        self.stdout.write(
            self.style.SUCCESS(
                f"Renumbered {len(changed)} table(s) and reset "
                f"{len(sequence_sql)} sequence(s)."
            )
        )

    def _target_models(self):
        target_models = []
        for model in apps.get_models():
            pk = model._meta.pk
            if (
                model._meta.managed
                and model._meta.app_label in TARGET_APP_LABELS
                and pk.name == "id"
                and isinstance(pk, (AutoField, BigAutoField, SmallAutoField))
            ):
                target_models.append(model)
        return target_models

    def _build_mappings(self, models):
        mappings = {}
        with connection.cursor() as cursor:
            for model in models:
                table = model._meta.db_table
                quoted_table = connection.ops.quote_name(table)
                cursor.execute(f"SELECT id FROM {quoted_table} ORDER BY id")
                ids = [row[0] for row in cursor.fetchall()]
                mappings[table] = {
                    old_id: position for position, old_id in enumerate(ids, start=1)
                }
        return mappings

    def _foreign_key_references(self, target_tables):
        references = defaultdict(list)
        with connection.cursor() as cursor:
            for child_table in connection.introspection.table_names(cursor):
                constraints = connection.introspection.get_constraints(
                    cursor, child_table
                )
                for constraint in constraints.values():
                    foreign_key = constraint.get("foreign_key")
                    columns = constraint.get("columns", [])
                    if (
                        foreign_key
                        and foreign_key[0] in target_tables
                        and foreign_key[1] == "id"
                        and len(columns) == 1
                    ):
                        references[foreign_key[0]].append(
                            (child_table, columns[0])
                        )
        return references

    def _ensure_references_are_deferrable(self, target_tables):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT conrelid::regclass::text, conname
                FROM pg_constraint
                WHERE contype = 'f'
                  AND confrelid::regclass::text = ANY(%s)
                  AND NOT condeferrable
                """,
                [list(target_tables)],
            )
            non_deferrable = cursor.fetchall()

        if non_deferrable:
            details = ", ".join(f"{table}.{name}" for table, name in non_deferrable)
            raise CommandError(f"Cannot safely renumber non-deferrable keys: {details}")

    def _show_plan(self, models, mappings):
        self.stdout.write("TABLE | COUNT | CURRENT IDS | NEW IDS")
        self.stdout.write("-" * 72)
        for model in models:
            table = model._meta.db_table
            mapping = mappings[table]
            if not mapping:
                continue
            old_ids = list(mapping)
            new_ids = list(mapping.values())
            self.stdout.write(
                f"{table} | {len(mapping)} | "
                f"{min(old_ids)}..{max(old_ids)} | "
                f"{min(new_ids)}..{max(new_ids)}"
            )

    def _apply_phase(self, cursor, mappings, references, models):
        models_by_table = {model._meta.db_table: model for model in models}

        for parent_table, mapping in mappings.items():
            self._update_integer_column(cursor, parent_table, "id", mapping)
            for child_table, child_column in references[parent_table]:
                self._update_integer_column(
                    cursor, child_table, child_column, mapping
                )

            model = models_by_table[parent_table]
            self._update_admin_log_object_ids(cursor, model, mapping)

    def _update_integer_column(self, cursor, table, column, mapping):
        if not mapping:
            return

        quoted_table = connection.ops.quote_name(table)
        quoted_column = connection.ops.quote_name(column)
        case_parts = []
        parameters = []

        for old_id, new_id in mapping.items():
            case_parts.append("WHEN %s THEN %s")
            parameters.extend([old_id, new_id])

        placeholders = ", ".join(["%s"] * len(mapping))
        parameters.extend(mapping.keys())
        cursor.execute(
            f"""
            UPDATE {quoted_table}
            SET {quoted_column} = CASE {quoted_column}
                {' '.join(case_parts)}
                ELSE {quoted_column}
            END
            WHERE {quoted_column} IN ({placeholders})
            """,
            parameters,
        )

    def _update_admin_log_object_ids(self, cursor, model, mapping):
        try:
            content_type = ContentType.objects.get_for_model(
                model, for_concrete_model=False
            )
        except ContentType.DoesNotExist:
            return

        case_parts = []
        parameters = []
        for old_id, new_id in mapping.items():
            case_parts.append("WHEN %s THEN %s")
            parameters.extend([str(old_id), str(new_id)])

        placeholders = ", ".join(["%s"] * len(mapping))
        parameters.append(content_type.pk)
        parameters.extend(str(old_id) for old_id in mapping)
        cursor.execute(
            f"""
            UPDATE django_admin_log
            SET object_id = CASE object_id
                {' '.join(case_parts)}
                ELSE object_id
            END
            WHERE content_type_id = %s
              AND object_id IN ({placeholders})
            """,
            parameters,
        )

    def _verify(self, models):
        with connection.cursor() as cursor:
            for model in models:
                table = model._meta.db_table
                quoted_table = connection.ops.quote_name(table)
                cursor.execute(f"SELECT id FROM {quoted_table} ORDER BY id")
                ids = [row[0] for row in cursor.fetchall()]
                expected = list(range(1, len(ids) + 1))
                if ids != expected:
                    raise CommandError(
                        f"Verification failed for {table}: IDs are not consecutive."
                    )
