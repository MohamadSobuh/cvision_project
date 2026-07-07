import React from 'react';
import TopicSection from './TopicSection';
import style from './Plan.module.css';

export default function TopicList({ planData, activeTopicId, onTopicClick }) {
    if (!planData || planData.length === 0) {
        return null;
    }

    return (
        <div className={style.topicListColumn}>
            {planData.map((topic) => (
                <TopicSection
                    key={topic.id}
                    topic={topic}
                    isActive={activeTopicId === topic.id}
                    onClick={onTopicClick}
                />
            ))}
        </div>
    );
}
