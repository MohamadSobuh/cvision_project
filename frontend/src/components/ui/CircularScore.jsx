import { useEffect, useState } from "react";
import style from "../../pages/user/AnalysisReport.module.css";

export default function CircularScore({ score }) {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        let current = 0;
        const interval = setInterval(() => {
            current += 1;
            if (current >= score) {
                current = score;
                clearInterval(interval);
            }
            setDisplayScore(current);
        }, 25);
        return () => clearInterval(interval);
    }, [score]);

    const color = getScoreColor(displayScore);

    function getScoreColor(score) {
        if (score < 50) return "#ff1900";
        if (score < 80) return "#ff8800";
        return "#017008";
    }

    return (
        <div className={style.circle} style={{ "--score": displayScore, "--color": color }}>
            <div className={style.inner}>{displayScore}%</div>
        </div>
    );
}