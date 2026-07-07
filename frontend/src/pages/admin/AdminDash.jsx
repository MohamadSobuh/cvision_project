import React, { useState, useEffect } from 'react';
import style from "./AdminDash.module.css";
import { FaUsers, FaListUl, FaQuestionCircle } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';


import api from '../../utils/axios';
export default function AdminDash({ language }) {
  const [totalusers, setTotalUsers] = useState(0);
  const [totaltasks, setTotalTasks] = useState(0);
  const [questions, setQuestions] = useState(0);
  const [lastUsers, setLastUsers] = useState([]);
  const navigate = useNavigate();

const ensureAuth = () => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || token === "undefined" || role !== "admin") {
            navigate("/login", {
                state: {
                    message: language === "ar" ? "انتهت جلسة التسجيل، يرجى تسجيل الدخول مجدداً" : "Session expired, please log in again",
                    type: "error"
                }
            });
            return false;
        }
        return true;
    };
  useEffect(() => {
    const fetchStats = async () => {

      try {
        if (!ensureAuth()) return;
        const response = await api.get("/dashboard/stats");
        console.log(response.data);
        setTotalUsers(response.data.total_users);
        setTotalTasks(response.data.total_tasks);
        setQuestions(response.data.quiz_questions);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };



    fetchStats();
  }, []);


  useEffect(() => {
    const fetchLatestUsers = async () => {
      if (!ensureAuth()) return;
      try {
        const response = await api.get("/dashboard/latest-users/");
        console.log(response.data);
        setLastUsers(response.data);


      } catch (err) {
        console.error("Error fetching latest users:", err);
      }
    };


    fetchLatestUsers();
  }, []);

  const { t, i18n } = useTranslation();


  return (
    <div className={language === 'ar' ? style.dashArabic : style.dash}>
      <div className={style.bgGrid} />

      <h1><b>Admin {t('dash')}</b></h1>
      <p>{t('overview')}</p>
      <br />
      <div className={`row ${style.cardsContainer}`}>
        <div className={`${style.card} col-md-3`}>
          <div>
            <p>{t('totalUsers')}</p>
            <b>{totalusers}</b>
          </div>
          <FaUsers className={style.iconStats} style={{ color: "#F1416F", background: "#fce1e6" }} />
        </div>

        <div className={`${style.card} col-md-3`}>
          <div>
            <p>{t('totalTasks')}</p>
            <b>{totaltasks}</b>
          </div>
          <FaListUl className={style.iconStats} style={{ color: "#3FB48D", background: "#ccf3e3" }} />
        </div>

        <div className={`${style.card} col-md-3`}>
          <div>
            <p>{t('quizQuestions')}</p>
            <b>{questions}</b>
          </div>
          <FaQuestionCircle className={style.iconStats} style={{ color: "#F76D2F", background: "#FEE9DA" }} />
        </div>
      </div>

      <div className={style.lastUsers}>
        <h3>{t('latestUsers')}</h3>
        <table className={`${style.tableLastUsers}`}>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('email')}</th>
              <th>{t('learningPlan')}</th>
            </tr>
          </thead>

          <tbody>
            {lastUsers.map((user) => (
              <tr key={user.id || user.email}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={style.planName}>{user.learningPlan}</span>
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>
    </div>
  )
}








