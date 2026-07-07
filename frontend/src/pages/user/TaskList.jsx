import React from 'react';
import TaskItem from './TaskItem';
import { FaHtml5, FaJs, FaReact, FaSlack, FaPython } from 'react-icons/fa';
import style from './Plan.module.css';
import { useTranslation } from "react-i18next";


export default function TaskList({ activeTopic, onTaskClick , language }) {
    if (!activeTopic) {
        return (
            <div className={style.taskListColumn}>
                <p>Please select a topic to view its tasks.</p>
            </div>
        );
    }


    const { title, description, tasks } = activeTopic;

    const getIcon = () => {
        if (title.toLowerCase().includes('html')) return FaHtml5;
        if (title.toLowerCase().includes('javascript')) return FaJs;
        if (title.toLowerCase().includes('react')) return FaReact;
        if (title.toLowerCase().includes('python')) return FaPython;
        return FaSlack;
    }
    const Icon = getIcon();


    const completedCount = tasks ? tasks.filter(task => task.status === 'completed').length : 0;
    const totalCount = tasks ? tasks.length : 0;
    const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return (
        <div className={style.taskListColumn}>
            <div className={style.taskListHeader}>
                <h2 className={style.taskListTitle}>
                    <Icon size={30} style={{ color: "#082F43" }} />
                    {title}
                </h2>
                <p className={style.taskListDesc}>
                    {description}
                </p>
                <div className={style.topicProgressRow}>
                    <span>{completedCount}/{totalCount} tasks , {progressPercent}%</span>
                </div>
                <div className={style.topicProgressBarContainer} style={{ backgroundColor: "#d1e8ee", height: "8px", borderRadius: "4px" }}>
                    <div className={style.topicProgressBarFill} style={{ width: `${progressPercent}%`, borderRadius: "4px" }} />
                </div>
            </div>

            <div className={style.tasksContainer}>
                {tasks && tasks.map((task, index) => (
                    <TaskItem key={task.id || index} index={index} task={task} onTaskClick={onTaskClick}  language={language}/>
                ))}
            </div>
        </div>
    );
}
