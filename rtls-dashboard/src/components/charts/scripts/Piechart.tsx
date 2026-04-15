import React from 'react';
import { Pie } from 'react-chartjs-2';
import "../../charts/styles/Barchart.css";

interface PieChartProps {
    title: string;
    labels: string[];
    data: number[];
    color?: string[]; // made this optional since you didn't use it in the provided code
}

const PieChart: React.FC<PieChartProps> = ({ title, labels, data }) => {
    return (
        <div className='doughnut-chart'>
            <Pie
                data={{
                    labels: labels,
                    datasets: [{
                        label: 'Segment',
                        data: data,
                        backgroundColor: [
                            'lightblue',
                            'orange',
                            'lightgreen',
                            'yellow',
                            'pink'
                        ],
                        borderColor: [
                            'lightblue',
                            'orange',
                            'lightgreen',
                            'yellow',
                            'pink'
                        ],
                        borderWidth: 1,
                    }],
                }}
                options={{
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: title,
                            font: {
                                size: 15
                            }
                        }
                    },
                    maintainAspectRatio: false,
                }}
            />
        </div>
    );
}

export default PieChart;
