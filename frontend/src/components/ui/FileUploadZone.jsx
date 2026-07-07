import { useState, useRef } from 'react'
import style from "../../pages/user/UploadCV.module.css";
import { FaFileArrowUp } from "react-icons/fa6";

export default function FileUploadZone({ file, setFile, setError, t, inputRef }) {

    const fileInputRef = useRef();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const uploadedFile = e.dataTransfer.files[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            setError("");
        }
    };

    return (
        <div
            className={`${style.uploadSection} ${isDragging ? style.dragging : ""}`}
            onClick={() => inputRef.current.click()} 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {!file ? (
                <>
                    <FaFileArrowUp className={style.uploadIcon} />
                    <p><b>{t('uploadText')}</b></p>
                    <p>{t('uploadHint')}</p>
                </>
            ) : (
                <>
                    <FaFileArrowUp className={style.uploadIcon} />
                    <p className={style.fileName}><b>{file.name}</b></p>
                    <p className={style.successMsg}>{t('fileSelected')}</p>
                </>
            )}

            <input
                type="file"
                ref={inputRef}
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                    const uploadedFile = e.target.files[0];
                    if (uploadedFile) {
                        setFile(uploadedFile);
                        setError("");
                    }
                }}
            />
        </div>

    );
}
