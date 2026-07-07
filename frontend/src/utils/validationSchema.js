import * as yup from 'yup';
import i18n from '../i18n';
const emailValidation = yup.string()
    .required(i18n.t("emailRequired"))
    .email(i18n.t("invalidEmail"));

const passwordValidation = yup.string()
    .required(i18n.t("passwordRequired"));


export const loginSchema = yup.object({
    email: emailValidation,
    password: passwordValidation,
});

export const signupSchemaForTasks = yup.object({
    task: yup.string().required(i18n.t("taskRequired")),
    topic: yup.string().required(i18n.t("topicRequired")),
    content: yup.string().required(i18n.t("contentRequired")),
    videoUrl: yup.string().url(i18n.t("validUrl")).notRequired(),
    imageUrl: yup.string().url(i18n.t("validUrl")).notRequired(),
    resources: yup.array().of(yup.string())
});

export const signupSchema = yup.object({
    first_name: yup.string().required(i18n.t("firstNameRequired")),
    last_name: yup.string().required(i18n.t("lastNameRequired")),
    email: emailValidation
        .required(i18n.t("emailRequired"))
        .email(i18n.t("invalidEmail"))
        .min(5, i18n.t("emailTooShort"))
        .max(50, i18n.t("emailTooLong")),

    password: passwordValidation
        .required(i18n.t("passwordRequired"))
        .min(8, i18n.t("passwordMin"))
        .max(20, i18n.t("passwordMax"))
        .matches(/[A-Z]/, i18n.t("passwordUppercase"))
        .matches(/[a-z]/, i18n.t("passwordLowercase"))
        .matches(/\d/, i18n.t("passwordNumber"))
        .matches(/[!@#$%^&*(),.?":{}|<>]/, i18n.t("passwordSpecial")),
});

export const editProfileSchema = yup.object({
    firstname: yup.string().required("First name is required"),
    lastname: yup.string().required("Last name is required"),
    email: emailValidation
        .required(i18n.t("emailRequired"))
        .email(i18n.t("invalidEmail"))
        .min(5, i18n.t("emailTooShort"))
        .max(50, i18n.t("emailTooLong")),

    field: yup.string(),
    password: yup.string()
        .transform((value) => (value === '' ? undefined : value))
        .notRequired()
        .min(8, i18n.t("passwordMin"))
        .max(20, i18n.t("passwordMax"))
        .matches(/[A-Z]/, i18n.t("passwordUppercase"))
        .matches(/[a-z]/, i18n.t("passwordLowercase"))
        .matches(/\d/, i18n.t("passwordNumber"))
        .matches(/[!@#$%^&*(),.?":{}|<>]/, i18n.t("passwordSpecial")),
});

export const questionSchema = yup.object().shape({
    questionType: yup
        .string()
        .required(i18n.t("questionTypeRequired")),

    associatedTask: yup
        .string()
        .required(i18n.t("associatedTaskRequired")),

    questionText: yup
        .string()
        .required(i18n.t("questionTextRequired"))
        .min(10, i18n.t("questionTextMin")),

    option1: yup.string().required(i18n.t("option1Required")),
    option2: yup.string().required(i18n.t("option2Required")),
    option3: yup.string().required(i18n.t("option3Required")),
    option4: yup.string().required(i18n.t("option4Required")),
    correctAnswer: yup
        .string()
        .required(i18n.t("correctAnswerRequired"))
        .nullable(),
});

export const topicSchema = yup.object().shape({
    title: yup.string().required(i18n.t("topicTitleRequired")),
    desc: yup.string().required(i18n.t("descriptionRequired")).min(10, i18n.t("descriptionTooShort")),
    tasks: yup.number().typeError(i18n.t("mustBeNumber")).notRequired().min(0, i18n.t("tasksNegative")).integer(),
    learning_plan: yup.string().required(i18n.t("categoryRequired")),
    difficulty: yup.string().required(i18n.t("difficultyRequired")),
});
