import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import "../../charts/styles/Linechart.css";
import { withTheme } from '@emotion/react';

// Define prop types
type LineChartProps = {
    title: string;
    labels: string[]; // assuming labels are strings, adjust if different
    data: number[]; // assuming data points are numbers, adjust if different
    color: string;
    outline: string;
    max?: number; // The '?' makes the prop optional and assigns a default value if not provided
};

const LineChart: React.FC<LineChartProps> = ({ title, labels, data, color, outline, max = 100 }) => {
    Chart.register(...registerables);

    return (
        <div className='linechart'>
            <Line
                data={{
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [color],
                        borderColor: [outline],
                        borderWidth: 1,
                    }],
                }}
                options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: title, // Added the title to the chart
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
                                font: { size: 9 },
                                color: 'lightgrey'
                            },
                        },
                        x: {
                            ticks: {
                                font: { size: 9 },
                                color: 'lightgrey'
                            },
                        }
                    }
                }}
            />
        </div>
    );
};

export default LineChart;
