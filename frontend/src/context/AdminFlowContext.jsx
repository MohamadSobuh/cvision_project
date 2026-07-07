import { createContext, useCallback, useState, useContext } from 'react';

import api from '../utils/axios';

const AdminFlowContext = createContext({
  topics: [],
  setTopics: () => { },
  fetchTopics: async () => { },
  loadingTopics: false,
  activeTask: null,
  setActiveTask: () => { },
  editTask: null,
  setEditTask: () => { },
});

export const AdminFlowProvider = ({ children }) => {
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [editTask, setEditTask] = useState(null);

  const fetchTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
     
      const response = await api.get("/dashboard/topics/");
      setTopics(response.data);
      return true;
    } catch (err) {
      console.error("Error fetching topics:", err);
      return false;
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  return (
    <AdminFlowContext.Provider value={{
      topics, setTopics,
      fetchTopics, loadingTopics, activeTask, setActiveTask, editTask, setEditTask
    }}>
      {children}
    </AdminFlowContext.Provider>
  );
};

// The provider and its companion hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAdminFlow = () => useContext(AdminFlowContext);
