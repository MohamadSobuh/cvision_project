import { createContext, useContext, useEffect, useState } from 'react';
import profileImg from '../images/profileImg.PNG';
import api from '../utils/axios';

const UserFlowContext = createContext({
  uploadedCV: null,
  setUploadedCV: () => {},
  targetField: '',
  setTargetField: () => {},
});

export const UserFlowProvider = ({ children }) => {
  const [userId, setUserId] = useState(() => {
    try {
      return localStorage.getItem("userId") || null;
    } catch {
      return null;
    }
  });
  const [history, setHistory] = useState([]);
  const [targetField, setTargetField] = useState('');
  const [analysisResult, setAnalysisResult] = useState({
    DesCV: "",
    strengths: [{ skill: "", description: "" }],
    weaknesses: [{ skill: "", description: "" }],
    score: 0,
  });
  const [placementScore, setPlacementScore] = useState(0);
  const [topics, setTopics] = useState([]);
  const [cvId, setCvId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const controller = "AbortController" in window ? new AbortController() : null;

    const fetchUser = async () => {
      let token = null;
      let role = null;
      try {
        token = localStorage.getItem("accessToken");
        role = localStorage.getItem("userRole");
      } catch {
        return;
      }

      if (!token || token === "undefined" || role !== "user") return;

      try {
        const response = await api.get('/userr/profile/', {
          signal: controller?.signal,
        });
        const data = response.data;
        if (!data.image) data.image = profileImg;
        setUser(data);
        try {
          localStorage.setItem('user', JSON.stringify(data));
        } catch {
          // Keep React state even when persistent storage is unavailable.
        }
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        console.error('Failed to fetch user profile:', err);
      }
    };

    fetchUser();

    return () => controller?.abort();
  }, []);

  return (
    <UserFlowContext.Provider value={{
      userId,
      setUserId,
      user,
      setUser,
      history,
      setHistory,
      targetField,
      setTargetField,
      analysisResult,
      setAnalysisResult,
      placementScore,
      setPlacementScore,
      topics,
      setTopics,
      activeTask,
      setActiveTask,
      cvId,
      setCvId,
    }}>
      {children}
    </UserFlowContext.Provider>
  );
};

// The provider and its companion hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useUserFlow = () => useContext(UserFlowContext);
