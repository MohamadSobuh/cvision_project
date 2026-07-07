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
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || null);
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
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("accessToken");
      const role = localStorage.getItem("userRole");
      if (!token || token === "undefined" || role !== "user") return;

      try {
        const response = await api.get('/userr/profile/');
        const data = response.data;
        if (!data.image) data.image = profileImg;
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    fetchUser();
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
