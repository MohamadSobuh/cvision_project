import { lazy,Suspense } from 'react';
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const UserLayout = lazy(() => import('./layouts/UserLayout'));
const AdminSidebar = lazy(() => import('./layouts/AdminSidebar'));
const Sidebar = lazy(() => import('./layouts/Sidebar'));
const Header = lazy(() => import('./layouts/Header'));

const Signin = lazy(() => import('./pages/auth/Signin'));
const Signup = lazy(() => import('./pages/auth/Signup'));

const AdminDash = lazy(() => import('./pages/admin/AdminDash'));
const Users = lazy(() => import('./pages/admin/Users'));
const Tasks = lazy(() => import('./pages/admin/Tasks'));
const QuizQuestions = lazy(() => import('./pages/admin/QuizQuestions'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const EditProfile = lazy(() => import('./pages/user/EditProfile'));
import { useTranslation } from "react-i18next";

const Home = lazy(() => import('./components/Home'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
import { useState, useEffect } from "react";
import { Route, Routes } from 'react-router-dom';
const UploadCV = lazy(() => import('./pages/user/UploadCV'));
const UserDash = lazy(() => import('./pages/user/UserDash'));
const SessionTimeout = lazy(() => import('./components/SessionTimeout'));

import { UserFlowProvider } from './context/UserFlowContext';
import { AdminFlowProvider } from './context/AdminFlowContext';
import LoadingScreen from "./components/ui/LoadingScreen";
import QuizNavigationGuard from "./components/QuizNavigationGuard";

const AnalysisReport = lazy(() => import('./pages/user/AnalysisReport'));
const AnalysisHistory = lazy(() => import('./pages/user/AnalysisHistory'));
const TaskAssQuiz = lazy(() => import('./pages/user/TaskAssQuiz'));
const QuizResult = lazy(() => import('./pages/user/QuizResult'));
const Plan = lazy(() => import('./pages/user/Plan'));
const Hero = lazy(() => import('./components/Hero'));
const TaskContent = lazy(() => import('./pages/user/TaskContent'));
const TaskItem = lazy(() => import('./pages/user/TaskItem'));
const AdminTaskContent = lazy(() => import('./pages/admin/AdminTaskContent'));
const EndOfPlan = lazy(() => import('./pages/user/EndOfPlan'));
const EndOfTopic = lazy(() => import('./pages/user/EndOfTopic'));
const ViewTaskContent = lazy(() => import('./pages/admin/ViewTaskContent'));
const Report = lazy(() => import('./pages/user/Report'));
const EditAdminProfile = lazy(() => import('./pages/admin/EditAdminProfile'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const LoadingPage = lazy(() => import('./pages/user/loadingPage'));
const TopicsPage = lazy(() => import('./pages/admin/TopicsPage'));
const InitalAssQuiz = lazy(() => import('./pages/user/InitalAssQuiz'));
const TaskAnswerResult = lazy(() => import("./pages/user/TaskAnswerResult"));

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const { t, i18n } = useTranslation();
  const [user] = useState(JSON.parse(localStorage.getItem("user")));
  


  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language, i18n]);
  return (
    <AdminFlowProvider>
      <UserFlowProvider>

        <div>
          {/* <AdminSidebar language={language} /> */}
          {/* <Signin/> */}
          {/* <Sidebar language={language} />*/}
          {/* <Header language={language} setLanguage={setLanguage} /> */}
          <SessionTimeout />
          <QuizNavigationGuard />
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Home language={language} setLanguage={setLanguage} />} />
            <Route path="/login" element={<Signin />} />
            <Route path='/user' element={<UserLayout user={user} language={language} setLanguage={setLanguage} />}>
              <Route path='profile' element={
                <UserProfile t={t} language={language} />
              } />

              <Route path='profile/edit' element={
                <EditProfile
                  t={t}
                  language={language}
                />
              } />

              <Route path='dashboard' element={<UserDash user={user} language={language} />}></Route>
              <Route path='upload' element={<UploadCV language={language} />} />
              <Route path='analysisHistory' element={<AnalysisHistory language={language} />} />
              <Route path='loading' element={<LoadingPage language={language} />} />

              <Route path='analysisReport' element={<AnalysisReport language={language} />} />
              <Route path='analysisReport/:cvId' element={<AnalysisReport language={language} />} />
              <Route path='quiz' element={<TaskAssQuiz language={language} />} />
              <Route path='quiz/:planTaskId' element={<TaskAssQuiz language={language} />} />
              <Route path='quizResult' element={<QuizResult language={language} />} />
              <Route path='plan' element={<Plan language={language} />} />
              <Route path='task' element={<TaskContent language={language} />} />
              <Route path='task/:planTaskId' element={<TaskContent language={language} />} />
              <Route path='endPlan' element={<EndOfPlan language={language} />} />
              <Route path='endTopic' element={<EndOfTopic language={language} />} />
              <Route path='report' element={<Report language={language} />} />
              <Route path='initalAssQuiz' element={<InitalAssQuiz language={language} />} />
              <Route path='taskAnswerResult' element={<TaskAnswerResult language={language} />} />



            </Route>

            <Route path='/admin' element={<AdminLayout user={user} language={language} setLanguage={setLanguage} />}>
              <Route path='dashboard' element={<AdminDash user={user} language={language} />} />
              <Route path='users' element={<Users language={language} />} />
              <Route path='tasks' element={<Tasks language={language} />} />
              <Route path='editTask' element={<AdminTaskContent language={language} />} />
              
                <Route path="topics" element={<TopicsPage language={language} />} >
                </Route>
              <Route path="quiz" element={<QuizQuestions language={language} />} />
              <Route path="settings" element={<Settings language={language} />} />
              <Route path='viewTaskContent' element={<ViewTaskContent language={language} />} />
              <Route path='profile' element={
                <AdminProfile t={t} language={language} />
              } />

              <Route path='profile/edit' element={
                <EditAdminProfile
                  t={t}
                  language={language}
                />
              } />
            </Route>
          </Routes>
          </Suspense>

        </div >
      </UserFlowProvider>
    </AdminFlowProvider>

  )
}
