import os
import sys

from django.apps import AppConfig
from django.conf import settings


class CvAnalyzerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "cv_analyzer"

    def ready(self):
        # Avoid loading the model in the development autoreloader parent.
        is_runserver = "runserver" in sys.argv
        is_reloader_parent = (
            settings.DEBUG
            and is_runserver
            and os.environ.get("RUN_MAIN") != "true"
        )
        if is_reloader_parent:
            return

        from .ai.services import initialize_bert_ner

        initialize_bert_ner()
