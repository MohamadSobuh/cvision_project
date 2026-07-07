import darklogo from "../../images/darklogo.png";
import 'bootstrap/dist/css/bootstrap.min.css';
import style from "./Sign.module.css";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from "axios";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../components/ui/Input";
import InputError from "../../components/ui/InputError";
import { signupSchema } from "../../utils/validationSchema";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useState } from "react";
import profileImg from "../../images/profileImg.PNG";
import { notify } from "../../utils/toast";

export default function Signup() {
    const location = useLocation();
    const language = location.state?.language || "en";
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [imagePreview, setImagePreview] = useState(profileImg);

    const inputs = [
        {
            name: "first_name",
            type: "text",
            label: t('firstNameLabel'),
            id: "firstname",
            col: "col-md-6"
        },
        {
            name: "last_name",
            type: "text",
            label: t('lastNameLabel'),
            id: "lastname",
            col: "col-md-6"
        },
        {
            name: "email",
            type: "email",
            label: t('email'),
            id: "emailInput",
            col: "col-md-12"
        },
        {
            name: "password",
            type: "password",
            label: t('password'),
            id: "passwordInput",
            col: "col-md-12"
        }
    ];
    const navigate = useNavigate();
    const { register, handleSubmit, setError, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(signupSchema)
    });

    const submitForm = async (data) => {
        const payload = new FormData();
        payload.append("first_name", data.first_name);
        payload.append("last_name", data.last_name);
        payload.append("email", data.email);
        payload.append("password", data.password);
        payload.append("bio", data.bio || "");
        if (data.image) {
            payload.append("image", data.image);
        }

        try {
            const response = await axios.post("http://127.0.0.1:8000/api/users/register/", payload);
            console.log("Success:", response.data);
            navigate("/login", {
                state: {
                    message: "تم تسجيل الحساب بنجاح",
                    type: "success",
                }
            });
        } catch (error) {
            if (error.response && error.response.data) {
                const serverErrors = error.response.data;

                Object.keys(serverErrors).forEach((field) => {
                    setError(field, {
                        type: "server",
                        message: serverErrors[field][0]
                    });
                });

                // 2. التعامل مع الأخطاء العامة (non_field_errors) إذا وجدت
                if (serverErrors.non_field_errors) {
                    setError("root.serverError", {
                        type: "server",
                        message: serverErrors.non_field_errors[0]
                    });
                }
            }
            console.error("Error details:", error.response?.data);
            notify(t("signupFailed", "Unable to create your account."), "error");
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            notify(t("imageRequired", "Please choose an image file."), "error");
            event.target.value = "";
            return;
        }

        setValue("image", file);
        setImagePreview(URL.createObjectURL(file));
    };
    const handlePasswordStrength = (e) => {
        const val = e.target.value;
        let strength = 0;

        if (/[A-Z]/.test(val)) strength++;
        if (/[a-z]/.test(val)) strength++;
        if (/\d/.test(val)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) strength++;
        if (val.length >= 8) strength++;

        if (strength <= 2) {
            e.target.style.border = "2px solid #ff0000";
        } else if (strength === 3 || strength === 4) {
            e.target.style.border = "2px solid #ff8c00";
        } else if (strength === 5) {
            e.target.style.border = "2px solid #07c937";
        }
    }

    return (
        <div className={`${style.bg} ${language === "ar" ? style.rtl : style.ltr}`}>
            <div className={style.glowTopRight}></div>
            <div className={style.glowBottomLeft}></div>
            <div className={style.bgGrid} />

            <div className={style.left}>
                <Link to="/" >
                    <img src={darklogo} alt="logo" className={`${style.logo}`} />
                </Link>
                <h3 ><b>{t('signupTitle')}</b></h3>
                <br />
                <form onSubmit={handleSubmit(submitForm)} >
                    <div className={style.signupProfile}>
                        <img src={imagePreview} alt="Profile preview" className={style.signupAvatar} />
                        <label className={style.imagePicker}>
                            {t("chooseProfileImage", "Choose profile image")}
                            <input type="file" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>

                    <div className="row">
                        {inputs.slice(0, 2).map((input) => (
                            <div key={input.id} className={`form-floating mb-3 ${input.col}`}>
                                <Input
                                    {...input}
                                    register={register}
                                    onChange={input.name === 'password' ? handlePasswordStrength : undefined}
                                />
                                <label htmlFor={input.id}>{input.label}</label>
                                {errors[input.name] && <InputError error={errors[input.name]} />}
                            </div>
                        ))}

                    </div>

                    {inputs.slice(2).map((input) => (
                        <div key={input.id} className={`form-floating mb-3 mt-3 ${input.col} ${style.floatingInputContainer}`}>

                            {input.name === "password" ? (
                                <>
                                    <Input
                                        {...input}
                                        register={register}
                                        type={showPassword ? "text" : "password"}
                                        className={`form-control ${language === 'ar' ? style.ps45 : style.pe45}`}
                                        onChange={handlePasswordStrength}
                                    />

                                    <span
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={style.eyeIcon}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </>
                            ) : (
                                <Input {...input} register={register} className="form-control" />
                            )}

                            <label htmlFor={input.id}>{input.label}</label>

                            {errors[input.name] && (
                                <div className={style.errorContainer}>
                                    <InputError error={errors[input.name]} />
                                </div>
                            )}
                        </div>
                    ))}

                    <div className={style.bioField}>
                        <label htmlFor="bio">{t("bio", "Bio")}</label>
                        <textarea
                            id="bio"
                            maxLength={500}
                            placeholder={t("bioPlaceholder", "Tell us a little about yourself")}
                            {...register("bio")}
                        />
                    </div>

                    <button type="submit" className={`${style.btn}`}> <b>{t('signup')}</b>  </button>
                </form>
                <br />
                <p> {t('haveAccount')}<Link to="/login" className={style.s}> <b>{t('login')}</b> </Link>
                </p>
            </div>

        </div>
    )
}

