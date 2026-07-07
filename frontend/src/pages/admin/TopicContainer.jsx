// src/pages/admin/TopicContainer.jsx
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';

const TopicContainer = ({ children }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { topics, setTopics } = useOutletContext();
    const [formData, setFormData] = useState(null);

    useEffect(() => {
        const topicToEdit = topics.find(topic => topic.id === parseInt(id));
        if (topicToEdit) {
            setFormData(topicToEdit);
        }
    }, [id, topics]);

    const handleSave = (updatedTopic) => {
        setTopics((prevTopics) =>
            prevTopics.map((topic) =>
                topic.id === updatedTopic.id ? updatedTopic : topic
            )
        );
        setFormData(updatedTopic);
        navigate('/admin/topics');
    };

    if (!formData) return null;

    return (
        <>
            {typeof children === 'function'
                ? children({ formData, handleSave })
                : children}
        </>
    );
};

export default TopicContainer;
