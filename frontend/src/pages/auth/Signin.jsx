import { useCallback, useEffect, useRef, useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import darklogo from "../../images/darklogo.png";
import Input from "../../components/ui/Input";
import InputError from "../../components/ui/InputError";
import Notification from "../../components/ui/Notification";
import { useUserFlow } from "../../context/UserFlowContext";
import { loginSchema } from "../../utils/validationSchema";
import style from "./Sign.module.css";

const API_URL = "http://127.0.0.1:8000/api/users";

export default function Signin() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setUserId, setUser } = useUserFlow();
    const googleButtonRef = useRef(null);
    const language = location.state?.language || "en";
    const [message, setMessage] = useState(() => ({
        show: Boolean(location.state?.message),
        text: location.state?.message || "",
        type: location.state?.type || "success",
    }));
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(loginSchema),
    });

    const showMessage = useCallback((text, type) => {
        setMessage({ show: true, text, type });
        setTimeout(() => setMessage({ show: false, text: "", type: "success" }), 3000);
    }, []);

    const completeLogin = useCallback((responseData) => {
        const { token, user } = responseData;

        localStorage.setItem("accessToken", token);
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userId", user.id);
        localStorage.setItem("userFirstName", user.first_name);
        localStorage.setItem("userLastName", user.last_name);
        setUserId(user.id);
        setUser(user);
        navigate(user.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
    }, [navigate, setUser, setUserId]);

    const handleGoogleCredential = useCallback(async ({ credential }) => {
        try {
            const response = await axios.post(`${API_URL}/google-login/`, { credential });
            completeLogin(response.data);
        } catch (error) {
            showMessage(
                error.response?.data?.error || t(
                    "googleLoginFailed",
                    "Google login failed. Please try again."
                ),
                "error"
            );
        }
    }, [completeLogin, showMessage, t]);

    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            return;
        }

        const renderGoogleButton = () => {
            if (!window.google || !googleButtonRef.current) {
                return;
            }
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredential,
            });
            window.google.accounts.id.renderButton(googleButtonRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                text: "signin_with",
                shape: "pill",
                width: googleButtonRef.current.offsetWidth,
            });
        };

        const existingScript = document.querySelector(
            'script[src="https://accounts.google.com/gsi/client"]'
        );
        if (existingScript) {
            if (window.google) {
                renderGoogleButton();
            } else {
                existingScript.addEventListener("load", renderGoogleButton, { once: true });
            }
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = renderGoogleButton;
        document.head.appendChild(script);
    }, [handleGoogleCredential]);

    const submitForm = async (data) => {
        try {
            const response = await axios.post(`${API_URL}/login/`, data);
            completeLogin(response.data);
        } catch (error) {
            if (error.response?.data?.non_field_errors) {
                setError("password", {
                    type: "server",
                    message: t("invalidEmailOrPassword"),
                });
            }
        }
    };

    const inputs = [
        {
            name: "email",
            type: "email",
            label: t("email"),
            id: "emailInput",
            col: "col-md-12",
        },
        {
            name: "password",
            type: showPassword ? "text" : "password",
            label: t("password"),
            id: "passwordInput",
            col: "col-md-12",
        },
    ];

    return (
        <div className={`${style.bg} ${language === "ar" ? style.rtl : style.ltr}`}>
            <Notification show={message.show} text={message.text} type={message.type} />
            <div className={style.glowTopRight}></div>
            <div className={style.glowBottomLeft}></div>
            <div className={style.bgGrid} />

            <div className={style.left}>
                <Link to="/">
                    <img src={darklogo} alt="logo" className={style.logo} />
                </Link>
                <h3><b>{t("welcomeLogIn")}</b></h3>
                <p>{t("loginMessge")}</p>
                <form onSubmit={handleSubmit(submitForm)}>
                    {inputs.map((input) => (
                        <div
                            key={input.id}
                            className={`form-floating mb-3 ${input.name === "email" ? "mt-3" : ""} ${style.floatingContainer}`}
                        >
                            <Input
                                {...input}
                                register={register}
                                className={`form-control ${input.name === "password" ? style.passwordInput : ""}`}
                            />
                            {input.name === "password" && (
                                <span
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={style.eyeIcon}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            )}
                            <label htmlFor={input.id}>{input.label}</label>
                            {input.name === "password" && errors[input.name] && (
                                <div className={style.errorWrapper}>
                                    <InputError error={errors[input.name]} />
                                </div>
                            )}
                        </div>
                    ))}
                    <button type="submit" className={style.btn} disabled={isSubmitting}>
                        <b>{t("login")}</b>
                    </button>
                </form>

                <div className={style.divider}>
                    <span>{t("orContinueWith", "or continue with")}</span>
                </div>
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                    <div ref={googleButtonRef} className={style.googleButton}></div>
                ) : (
                    <p className={style.googleNotConfigured}>
                        {t("googleNotConfigured", "Google login is not configured.")}
                    </p>
                )}

                <br />
                <p>
                    {t("noAccount")}
                    <Link to="/signup" className={style.s} state={{ language }}>
                        {" "}<b>{t("signup")}</b>
                    </Link>
                </p>
            </div>
        </div>
    );
}
