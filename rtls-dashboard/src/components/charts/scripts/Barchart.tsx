import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import "../../charts/styles/Barchart.css";

interface BarChartProps {
    title: string;
    labels: string[];
    data: number[];
    color: string;
    outline: string;
    max?: number;
}

const BarChart: React.FC<BarChartProps> = ({ title, labels, data, color, outline, max = 100 }) => {
    Chart.register(...registerables);

    return (
        <div className='barchart'>
            <Bar
                data={{
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            color,
                        ],
                        borderColor: [
                            outline
                        ],
                        borderWidth: 1,
                        maxBarThickness: 80
                    }],
                }}
                options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: title,
                            font: {
                                size: 12,
                                color: "white"
                            } as any
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: max,
                            ticks: {
                                font: {
                                    size: 9,
                                },
                                color: 'lightgrey'
                            },
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 9,
                                },
                                color: 'lightgrey'
                            },
                        }
                    }
                }}
            />
        </div>
    );
}

export default BarChart;