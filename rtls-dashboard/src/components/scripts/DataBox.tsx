import { GoPerson, GoTools } from "react-icons/go"
import { AiOutlineWarning } from "react-icons/ai"
import { SiVirustotal } from "react-icons/si"
import { ImEnter, ImExit } from "react-icons/im"


import '../styles/DataBox.css'

type DataBoxProps = {
    factory: number | string;
    logo: "People" | "Objects" | "Total" | "Issues";
    today: number | string;
    manufactoring: number | string;
};

const DataBox: React.FC<DataBoxProps> = ({ factory, logo, today, manufactoring }) => {

    return (
        <div className="databox">
            {logo == "People" && <div className={"logo-box-person"}>
                <ImEnter className="databox-logo" />
                <h2 className="databox-title">Entrances</h2>
            </div>}

            {logo == "Objects" && <div className={"logo-box-equipment"}>
                <ImExit className="databox-logo" />
                <h3 className="databox-title">Exits</h3>
            </div>}

            {logo == "Total" && <div className={"logo-box-entries"}>
                <GoPerson className="databox-logo" />
                <h3 className="databox-title">Total</h3>
            </div>}

            {logo == "Issues" && <div className={"logo-box-issues"}>
                <AiOutlineWarning className="databox-logo" />
                <h3 className="databox-title">{logo}</h3>
            </div>}

            <div className="databox-content">
                <div className="today-field">
                    <h2>CP Factory</h2>
                    <p>{factory}</p>
                </div>
                <br></br>
                <div className="week-field">
                    <h2>Manufactoring</h2>
                    <p>{manufactoring}</p>
                </div>
            </div>
        </div>
    )
}

export default DataBox;