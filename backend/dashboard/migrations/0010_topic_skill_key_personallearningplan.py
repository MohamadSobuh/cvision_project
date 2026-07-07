from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0009_userprofile_image'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # إضافة حقل skill_key لنموذج Topic
        migrations.AddField(
            model_name='topic',
            name='skill_key',
            field=models.CharField(
                blank=True,
                null=True,
                max_length=100,
                help_text='مفتاح المهارة المقابل لهذا الموضوع (مثال: react, python, docker)',
            ),
        ),

        # إنشاء نموذج PersonalLearningPlan
        migrations.CreateModel(
            name='PersonalLearningPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('weak_skills', models.JSONField(blank=True, default=list, help_text='قائمة المهارات الضعيفة التي بُنيت عليها الخطة')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='personal_plan',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('base_plan', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='dashboard.learningplan',
                    help_text='خطة التعلم الأساسية (المجال) التي بُنيت منها هذه الخطة',
                )),
                ('topics', models.ManyToManyField(
                    blank=True,
                    help_text='المواضيع المحددة لهذا المستخدم بناءً على نقاط ضعفه',
                    related_name='personal_plans',
                    to='dashboard.topic',
                )),
            ],
            options={
                'verbose_name': 'خطة تعلم شخصية',
                'verbose_name_plural': 'خطط التعلم الشخصية',
            },
        ),
    ]
