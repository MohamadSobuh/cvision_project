from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("dashboard", "0010_topic_skill_key_personallearningplan"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="bio",
            field=models.TextField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="google_picture_url",
            field=models.URLField(blank=True, default=""),
        ),
    ]
