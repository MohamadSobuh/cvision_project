import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import style from "./Report.module.css";
import { FaCloudUploadAlt, FaBolt, FaCheckCircle, FaTimes } from "react-icons/fa";
import api from "../../utils/axios";
import {useNavigate} from "react-router-dom";



export default function Report({ language }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [priority, setPriority] = useState("");
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState("");
    const [screenshotError, setScreenshotError] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const selectScreenshot = (file) => {
        setScreenshotError("");

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setScreenshotError(t("imageFileRequired"));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setScreenshotError(t("imageFileTooLarge"));
            return;
        }

        setScreenshot(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        selectScreenshot(e.dataTransfer.files[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const removeScreenshot = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setScreenshot(null);
        setScreenshotError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        setError("");

        if (!title.trim()) {
            setError(t("errorRequiredFields"));
            return;
        }
        if (!description.trim()) {
            setError(t("errorRequiredFields"));
            return;
        }
        if (!priority) {
            setError(t("errorRequiredFields"));
            return;
        }


        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("priority", priority);
        formData.append("description", description.trim());
        if (screenshot) {
            formData.append("screenshot", screenshot);
        }

        try {
            setLoading(true);
            await api.post('/userr/send-report/', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setSuccess(true);
            setTitle("");
            setDescription("");
            setPriority("");
            setScreenshot(null);
            navigate("/user/dashboard", {
                state: {
                    message: language === 'ar' ? "تم إرسال التقرير بنجاح" : "Report sent successfully",
                    success: true
                }
            });
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || token === "undefined" || role !== "user") {
            navigate("/login", {
                state: {
                    message: language === "ar" ? "انتهت جلسة التسجيل، يرجى تسجيل الدخول مجدداً" : "Session expired, please log in again",
                    type: "error"
                }
            });
        }
    }, [language, navigate]);

    useEffect(() => {
        if (!screenshot) {
            setScreenshotPreview("");
            return;
        }

        const previewUrl = URL.createObjectURL(screenshot);
        setScreenshotPreview(previewUrl);

        return () => URL.revokeObjectURL(previewUrl);
    }, [screenshot]);

    return (
        <div className={language === 'ar' ? style.reportAr : style.report}>
            <div className={style.bgGrid} />

            <div className={style.support}>{t("supportCenter")}</div>
            <h1><b>{t("reportsFeedback")}</b></h1>
            <p className={style.help}>{t("helpText")}</p>
            <div className={style.contentRow}>
                <div className={style.reportDetails}>
                    <h3><b>{t("reportDetails")}</b></h3>
                    <br />
                    <b>{t("reportPageTitle")}</b>
                    <br />
                    <input
                        type="text"
                        required
                        className={style.reportTitle}
                        placeholder={t("reportTitlePlaceholder")}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />                    <br />
                    <b>{t("priorityLevel")}</b>
                    <br />

                    <div className="row justify-content-center align-items-center text-center mt-3">
                        <button onClick={() => setPriority("low")} className={`${style.priorityLevelLow} col-md-3 ${priority === "low" ? style.active : ""}`}>
                            <div className={style.lowCircle}></div>{t("low")}
                        </button>

                        <button onClick={() => setPriority("medium")} className={`${style.priorityLevelMed} col-md-3 ${priority === "medium" ? style.active : ""}`}>
                            <div className={style.medCircle}></div>{t("mediumpriority")}
                        </button>

                        <button onClick={() => setPriority("high")} className={`${style.priorityLevelHigh} col-md-3 ${priority === "high" ? style.active : ""}`}>
                            <div className={style.highCircle}></div>{t("high")}
                        </button>
                    </div>

                    <b>{t("describeIssue")}</b>
                    <textarea
                        placeholder={t("descriptionPlaceholder")}
                        className={`form-control ${style.reportTextarea}`}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                    <b>{t("uploadScreenshot")}</b>
                    <div
                        className={`${style.dropZone} ${dragActive ? style.activeDrop : ""}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {!screenshot ? (
                            <>
                                <FaCloudUploadAlt size={40} className={style.uploadIcon} />
                                <br />
                                <b>{t("dragDropText")}</b>
                                <p>{t("orClick")}</p>
                            </>
                        ) : (
                            <div className={style.previewContent}>
                                <img
                                    src={screenshotPreview}
                                    alt={t("screenshotPreview")}
                                    className={style.screenshotPreview}
                                />
                                <div className={style.fileDetails}>
                                    <FaCheckCircle className={style.successIcon} />
                                    <div>
                                        <b>{t("uploadSuccess")}</b>
                                        <span>{screenshot.name}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={style.removeImage}
                                    onClick={removeScreenshot}
                                    aria-label={t("removeScreenshot")}
                                    title={t("removeScreenshot")}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className={style.hiddenInput}
                            aria-label={t("uploadScreenshot")}
                            onChange={(e) => selectScreenshot(e.target.files[0])}
                        />
                    </div>

                    {screenshotError && (
                        <div className={style.errorBox}>
                            {screenshotError}
                        </div>
                    )}

                    {error && (
                        <div className={style.errorBox}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={style.successBox || style.errorBox} style={{ background: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" }}>
                            {t("reportSentSuccess") || "Report sent successfully! Check your email for confirmation."}
                        </div>
                    )}

                    <button
                        className={style.submit}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (t("sending") || "Sending...") : t("submitReport")}
                    </button>
                </div>
                <div className={style.sideColumn}>

                    <div className={style.tipsBox}>
                        <h3><b>{t("helpfulTips")}</b></h3>
                        <br />
                        <ul>
                            <li>{t("helpfulTip1")}</li>
                            <li>{t("helpfulTip2")}</li>
                            <li>{t("helpfulTip3")}</li>
                        </ul>

                    </div>

                    <div className={style.urgentBox}>
                        <h4> <FaBolt className={style.boltIcon} />  {t("urgentIssues")} </h4>
                        <p> {t("urgentText")}  </p>
                    </div>
                </div>

            </div>

        </div>
    )
}
