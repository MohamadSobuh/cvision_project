from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from dashboard.models import (
    LearningPlan, UserProfile, Topic, Task, Question, 
    SystemSetting, QuizResult, PersonalLearningPlan
)
from userr.models import UserCV, AnalysisHistory, UserTopicProgress, QuizAttempt, QuizAnswer
from learning_plans.models import LearningPlan as GeneratedPlan, Module, Task as GeneratedTask
from datetime import date, timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'إضافة جميع البيانات التجريبية للمشروع كاملاً'

    def handle(self, *args, **kwargs):
        self.stdout.write('🚀 جاري إضافة البيانات التجريبية...\n')

        # =========================================================
        # 1. خطط التعلم (Learning Plans)
        # =========================================================
        self.stdout.write('📚 [1/9] إضافة خطط التعلم...')
        plans_data = ['Frontend', 'Backend', 'Fullstack', 'DevOps', 'Mobile']
        plan_objects = {}
        for plan_name in plans_data:
            plan_objects[plan_name], _ = LearningPlan.objects.get_or_create(name=plan_name)
            self.stdout.write(f'   ✓ {plan_name}')

        # =========================================================
        # 2. المستخدمين (Users)
        # =========================================================
        self.stdout.write('\n👥 [2/9] إضافة المستخدمين...')
        
        users_data = [
            {'username': 'isra', 'email': 'isra@gmail.com', 'first_name': 'Isra', 'last_name': 'Shtaiwi', 
             'plan': 'Frontend', 'progress': 20, 'cvs': 1, 'join_date': date(2025, 11, 7)},
            {'username': 'besan', 'email': 'besan@gmail.com', 'first_name': 'Besan', 'last_name': 'Ashraf', 
             'plan': 'Backend', 'progress': 100, 'cvs': 4, 'join_date': date(2025, 11, 7)},
            {'username': 'mohammad', 'email': 'mohammad@gmail.com', 'first_name': 'Mohammad', 'last_name': 'Sobuh', 
             'plan': 'Fullstack', 'progress': 80, 'cvs': 1, 'join_date': date(2025, 11, 7)},
            {'username': 'shahd', 'email': 'shahd@gmail.com', 'first_name': 'Shahd', 'last_name': 'Ibrahem', 
             'plan': 'Frontend', 'progress': 50, 'cvs': 3, 'join_date': date(2025, 11, 7)},
            {'username': 'ahmed', 'email': 'ahmed@gmail.com', 'first_name': 'Ahmed', 'last_name': 'Ali', 
             'plan': 'Backend', 'progress': 30, 'cvs': 2, 'join_date': date(2025, 12, 15)},
            {'username': 'sara', 'email': 'sara@gmail.com', 'first_name': 'Sara', 'last_name': 'Mahmoud', 
             'plan': 'Frontend', 'progress': 45, 'cvs': 2, 'join_date': date(2026, 1, 10)},
            {'username': 'admin', 'email': 'admin@cvision.com', 'first_name': 'Admin', 'last_name': 'User', 
             'plan': 'Fullstack', 'progress': 0, 'cvs': 0, 'join_date': date(2026, 1, 1), 'is_staff': True, 'is_superuser': True},
        ]

        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'is_staff': u.get('is_staff', False),
                    'is_superuser': u.get('is_superuser', False),
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                self.stdout.write(f'   ✓ مستخدم جديد: {u["username"]}')
            else:
                self.stdout.write(f'   ○ مستخدم موجود: {u["username"]}')

            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'learning_plan': plan_objects[u['plan']],
                    'progress': u['progress'],
                    'cvs_count': u['cvs'],
                    'join_date': u['join_date']
                }
            )

        # =========================================================
        # 3. المواضيع (Topics)
        # =========================================================
        self.stdout.write('\n📖 [3/9] إضافة المواضيع...')
        
        topics_data = [
            # Frontend
            {'title': 'HTML & CSS Fundamentals', 'description': 'تعلم أساسيات هيكلة وتصميم المواقع',
             'learning_plan': plan_objects['Frontend'], 'difficulty': 'easy', 'tasks_count': 8, 'order': 1, 'skill_key': 'html_css'},
            {'title': 'JavaScript Essentials', 'description': 'المفاهيم الأساسية لبرمجة JavaScript',
             'learning_plan': plan_objects['Frontend'], 'difficulty': 'easy', 'tasks_count': 12, 'order': 2, 'skill_key': 'javascript'},
            {'title': 'React Framework', 'description': 'بناء تطبيقات ويب حديثة باستخدام React',
             'learning_plan': plan_objects['Frontend'], 'difficulty': 'medium', 'tasks_count': 15, 'order': 3, 'skill_key': 'react'},
            {'title': 'Advanced React Patterns', 'description': 'تعلم الأنماط المتقدمة في React',
             'learning_plan': plan_objects['Frontend'], 'difficulty': 'hard', 'tasks_count': 10, 'order': 4, 'skill_key': 'react_advanced'},
            {'title': 'Tailwind CSS', 'description': 'تصميم واجهات سريعة باستخدام Tailwind',
             'learning_plan': plan_objects['Frontend'], 'difficulty': 'easy', 'tasks_count': 6, 'order': 5, 'skill_key': 'tailwind'},
            
            # Backend
            {'title': 'Python Basics', 'description': 'تعلم أساسيات لغة Python',
             'learning_plan': plan_objects['Backend'], 'difficulty': 'easy', 'tasks_count': 10, 'order': 1, 'skill_key': 'python'},
            {'title': 'Django Framework', 'description': 'بناء تطبيقات ويب باستخدام Django',
             'learning_plan': plan_objects['Backend'], 'difficulty': 'medium', 'tasks_count': 14, 'order': 2, 'skill_key': 'django'},
            {'title': 'RESTful APIs', 'description': 'تصميم وتطوير واجهات برمجية RESTful',
             'learning_plan': plan_objects['Backend'], 'difficulty': 'medium', 'tasks_count': 8, 'order': 3, 'skill_key': 'rest_api'},
            {'title': 'Databases', 'description': 'SQL و NoSQL قواعد البيانات',
             'learning_plan': plan_objects['Backend'], 'difficulty': 'hard', 'tasks_count': 12, 'order': 4, 'skill_key': 'database'},
            
            # Fullstack
            {'title': 'Fullstack Integration', 'description': 'ربط الواجهة الأمامية بالخلفية',
             'learning_plan': plan_objects['Fullstack'], 'difficulty': 'medium', 'tasks_count': 10, 'order': 1, 'skill_key': 'fullstack'},
            {'title': 'Deployment & DevOps', 'description': 'نشر التطبيقات على السيرفرات',
             'learning_plan': plan_objects['Fullstack'], 'difficulty': 'hard', 'tasks_count': 8, 'order': 2, 'skill_key': 'devops'},
        ]

        for topic_data in topics_data:
            topic, created = Topic.objects.get_or_create(
                title=topic_data['title'],
                defaults=topic_data
            )
            if created:
                self.stdout.write(f'   ✓ {topic_data["title"]} ({topic_data["difficulty"]})')
            else:
                self.stdout.write(f'   ○ {topic_data["title"]} موجود')

        # =========================================================
        # 4. المهام (Tasks)
        # =========================================================
        self.stdout.write('\n✅ [4/9] إضافة المهام...')
        
        html_topic = Topic.objects.get(title='HTML & CSS Fundamentals')
        js_topic = Topic.objects.get(title='JavaScript Essentials')
        react_topic = Topic.objects.get(title='React Framework')

        tasks_data = [
            # HTML & CSS
            {'title': 'Introduction to HTML', 'topic': html_topic, 'content': 'تعلم أساسيات هيكلة HTML والعناصر الأساسية', 'order': 1},
            {'title': 'CSS Selectors', 'topic': html_topic, 'content': 'تعلم المحددات في CSS والكلاسات', 'order': 2},
            {'title': 'Flexbox Layout', 'topic': html_topic, 'content': 'تعلم تخطيط الصفحات باستخدام Flexbox', 'order': 3},
            {'title': 'CSS Grid', 'topic': html_topic, 'content': 'تعلم نظام الشبكات CSS Grid', 'order': 4},
            
            # JavaScript
            {'title': 'Variables and Data Types', 'topic': js_topic, 'content': 'تعلم المتغيرات وأنواع البيانات', 'order': 1},
            {'title': 'Functions and Scope', 'topic': js_topic, 'content': 'تعلم الدوال والنطاق في JavaScript', 'order': 2},
            {'title': 'Arrays and Objects', 'topic': js_topic, 'content': 'تعلم المصفوفات والكائنات', 'order': 3},
            {'title': 'ES6+ Features', 'topic': js_topic, 'content': 'تعلم ميزات JavaScript الحديثة', 'order': 4},
            
            # React
            {'title': 'React Components', 'topic': react_topic, 'content': 'بناء مكونات React قابلة لإعادة الاستخدام', 'order': 1},
            {'title': 'State Management', 'topic': react_topic, 'content': 'إدارة الحالة في React باستخدام useState', 'order': 2},
            {'title': 'Effects and Lifecycle', 'topic': react_topic, 'content': 'استخدام useEffect لإدارة دورة الحياة', 'order': 3},
            {'title': 'React Router', 'topic': react_topic, 'content': 'تعلم التنقل بين الصفحات في React', 'order': 4},
        ]

        for task_data in tasks_data:
            task, created = Task.objects.get_or_create(
                title=task_data['title'],
                topic=task_data['topic'],
                defaults=task_data
            )
            if created:
                self.stdout.write(f'   ✓ {task_data["title"]}')

        # =========================================================
        # 5. الأسئلة (Questions)
        # =========================================================
        self.stdout.write('\n❓ [5/9] إضافة أسئلة الاختبار...')

        questions_data = [
            # Placement - HTML & CSS
            {'question_type': 'placement', 
             'question_text': 'تستخدم لتغيير لون الخلفية؟ CSS أي خاصية',
             'option_a': 'bg-color', 'option_b': 'background-color', 
             'option_c': 'color', 'option_d': 'background',
             'correct_answer': 'B', 'topic': html_topic, 'order': 1},
            {'question_type': 'placement', 
             'question_text': 'ما هو العنصر المستخدم لعرض رابط في HTML؟',
             'option_a': '<link>', 'option_b': '<a>', 
             'option_c': '<href>', 'option_d': '<url>',
             'correct_answer': 'B', 'topic': html_topic, 'order': 2},
            {'question_type': 'placement', 
             'question_text': 'ما هو الفرق بين "==" و "===" في JavaScript؟',
             'option_a': 'لا يوجد فرق', 'option_b': '=== يقارن القيمة فقط',
             'option_c': '=== يقارن القيمة والنوع', 'option_d': '== يقارن القيمة والنوع',
             'correct_answer': 'C', 'topic': js_topic, 'order': 1},
            {'question_type': 'placement', 
             'question_text': 'ما هي الطريقة الصحيحة لتعريف متغير لا يمكن تغيير قيمته لاحقاً؟',
             'option_a': 'var', 'option_b': 'let', 'option_c': 'const', 'option_d': 'static',
             'correct_answer': 'C', 'topic': js_topic, 'order': 2},
            {'question_type': 'task_quiz', 
             'question_text': 'في المكونات الوظيفية؟ (State) يستخدم لإدارة الحالة "Hook" أي',
             'option_a': 'useEffect', 'option_b': 'useContext', 
             'option_c': 'useState', 'option_d': 'useReducer',
             'correct_answer': 'C', 'task': Task.objects.get(title='State Management'), 'order': 1},
            {'question_type': 'task_quiz', 
             'question_text': 'ما هو المكون المستخدم لتجميع العناصر في React؟',
             'option_a': '<div>', 'option_b': '<Fragment>', 
             'option_c': '<Container>', 'option_d': '<Wrapper>',
             'correct_answer': 'B', 'task': Task.objects.get(title='React Components'), 'order': 2},
        ]

        for q_data in questions_data:
            if q_data['question_type'] == 'placement':
                question, created = Question.objects.get_or_create(
                    question_text=q_data['question_text'],
                    question_type='placement',
                    topic=q_data.get('topic'),
                    defaults={
                        'option_a': q_data['option_a'],
                        'option_b': q_data['option_b'],
                        'option_c': q_data.get('option_c', ''),
                        'option_d': q_data.get('option_d', ''),
                        'correct_answer': q_data['correct_answer'],
                        'order': q_data.get('order', 0)
                    }
                )
            else:
                question, created = Question.objects.get_or_create(
                    question_text=q_data['question_text'],
                    question_type='task_quiz',
                    task=q_data.get('task'),
                    defaults={
                        'option_a': q_data['option_a'],
                        'option_b': q_data['option_b'],
                        'option_c': q_data.get('option_c', ''),
                        'option_d': q_data.get('option_d', ''),
                        'correct_answer': q_data['correct_answer'],
                        'order': q_data.get('order', 0)
                    }
                )
            if created:
                self.stdout.write(f'   ✓ {q_data["question_text"][:40]}...')

        # =========================================================
        # 6. إعدادات النظام (System Settings)
        # =========================================================
        self.stdout.write('\n⚙️ [6/9] إضافة إعدادات النظام...')
        settings, created = SystemSetting.objects.get_or_create(
            id=1,
            defaults={
                'site_name': 'CVision',
                'default_language': 'ar',
                'session_timeout': 30,
                'two_factor_auth': False,
                'allow_registration': True,
                'email_notifications': True,
            }
        )
        self.stdout.write(f'   ✓ إعدادات النظام: {"تم إنشاؤها" if created else "موجودة"}')

        # =========================================================
        # 7. تحليلات المستخدم (AnalysisHistory)
        # =========================================================
        self.stdout.write('\n📊 [7/9] إضافة تحليلات المستخدم...')
        
        first_user = User.objects.first()
        
        for user in User.objects.all()[:3]:
            analysis, created = AnalysisHistory.objects.get_or_create(
                user=user,
                learning_plan=plan_objects['Frontend'],
                file_name=f"{user.username}_cv.pdf",
                defaults={
                    'analysis_score': random.randint(50, 90),
                    'analysis_data': {
                        'strengths': ['مهارات تواصل', 'خبرة عملية', 'التزام'],
                        'weaknesses': ['يحتاج تحسين React', 'يحتاج تعلم TypeScript'],
                        'recommendations': ['دراسة React', 'التدرب على API']
                    }
                }
            )
            if created:
                self.stdout.write(f'   ✓ تحليل للمستخدم: {user.username}')

        # =========================================================
        # 8. ملفات المستخدمين (UserCV)
        # =========================================================
        self.stdout.write('\n📄 [8/9] إضافة ملفات المستخدمين...')
        
        for user in User.objects.all()[:3]:
            cv, created = UserCV.objects.get_or_create(
                user=user,
                file_name=f"{user.username}_cv.pdf",
                defaults={
                    'file_path': f"cvs/user_{user.id}_{user.username}_cv.pdf",
                    'analysis_result': {
                        'field': 'Frontend',
                        'overall_score': random.randint(50, 90),
                        'strengths': ['HTML', 'CSS', 'JavaScript'],
                        'weaknesses': ['React', 'TypeScript'],
                        'required_skills': ['React', 'TypeScript', 'Node.js']
                    }
                }
            )
            if created:
                self.stdout.write(f'   ✓ ملف CV للمستخدم: {user.username}')

        # =========================================================
        # 9. تقدم المستخدمين (UserTopicProgress)
        # =========================================================
        self.stdout.write('\n📈 [9/9] إضافة تقدم المستخدمين...')
        
        for user in User.objects.all()[:3]:
            topics = Topic.objects.filter(learning_plan=plan_objects['Frontend'])[:2]
            for topic in topics:
                progress, created = UserTopicProgress.objects.get_or_create(
                    user=user,
                    topic=topic,
                    defaults={
                        'total_tasks': Task.objects.filter(topic=topic).count(),
                        'completed_tasks': random.randint(0, 3),
                    }
                )
                progress.update_progress()
                self.stdout.write(f'   ✓ تقدم {user.username} في {topic.title}: {progress.progress_percentage}%')

        # =========================================================
        # النتيجة النهائية
        # =========================================================
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✨ تم إضافة جميع البيانات التجريبية بنجاح! ✨'))
        self.stdout.write('='*60)
        self.stdout.write(f'''
📊 ملخص البيانات:
   👥 المستخدمين: {User.objects.count()}
   📚 خطط التعلم: {LearningPlan.objects.count()}
   📖 المواضيع: {Topic.objects.count()}
   ✅ المهام: {Task.objects.count()}
   ❓ الأسئلة: {Question.objects.count()}
   📊 تحليلات المستخدم: {AnalysisHistory.objects.count()}
   📄 ملفات CV: {UserCV.objects.count()}

🔐 بيانات تسجيل الدخول:
   admin@cvision.com / admin123 (مشرف)
   isra@gmail.com / password123
   besan@gmail.com / password123
   mohammad@gmail.com / password123
   shahd@gmail.com / password123
''')