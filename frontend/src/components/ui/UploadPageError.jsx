import style from "../../pages/user/UploadCV.module.css";

const UploadPageError = ({ error }) => {
    if (!error) return null;

    return (
        <div className={style.errorMsg}>
            {error}
        </div>
    );
};

export default UploadPageError;