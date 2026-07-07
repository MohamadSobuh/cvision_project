import style from "./EmptyPage.module.css";

const EmptyPage = ({icon ,title , message  , btnText , onClick }) => {
  return (
    <div className={style.emptyPage}>
        <div>{icon}</div>
        <h3><b>{title}</b></h3>
        <p>{message }</p>
        <button onClick ={onClick}>{btnText}</button>
    </div>
  )
}
export default EmptyPage;
