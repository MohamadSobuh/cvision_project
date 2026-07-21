import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
    timeout: 60000,
    headers: {
        "Content-Type": "application/json",
        
    }
})

api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    }

    let token = null;
    try {
        token = localStorage.getItem("accessToken");
    } catch {
        token = null;
    }

    if (token && token !== "undefined") {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});



export default api;
