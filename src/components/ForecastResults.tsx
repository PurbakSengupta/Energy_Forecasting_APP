import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ForecastResult } from './PredictionDashboard';

interface ForecastResultsProps {
  results: ForecastResult;
}

export const ForecastResults: React.FC<ForecastResultsProps> = ({ results }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'simple' | 'comparison'>('simple');
  
  useEffect(() => {
    if (!svgRef.current || !results) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, results.forecast.length - 1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([
        d3.min([...results.forecast, ...(results.baseline || [])]) || 0,
        d3.max([...results.forecast, ...(results.baseline || [])]) || 100
      ])
      .range([height, 0]);

    // Create line generators
    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d));

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));

    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));

    // Add forecast line
    const forecastPath = g.append("path")
      .datum(results.forecast)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add baseline if in comparison mode
    if (
      viewMode === 'comparison' &&
      Array.isArray(results.baseline) &&
      results.baseline.length === results.forecast.length
    ) {
      g.append("path")
        .datum(results.baseline)
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", line);
    }    

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .extent([[0, 0], [width, height]])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Add tooltip
    const tooltip = d3.select(tooltipRef.current);
    
    const mouseover = (event: MouseEvent, d: number) => {
      tooltip
        .style("opacity", 1)
        .html(`Value: ${d.toFixed(2)}`);
    };

    const mousemove = (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      tooltip
        .style("left", `${x + margin.left}px`)
        .style("top", `${y + margin.top - 28}px`);
    };

    const mouseleave = () => {
      tooltip.style("opacity", 0);
    };

    // Add interactive points
    g.selectAll("circle")
      .data(results.forecast)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => x(i))
      .attr("cy", d => y(d))
      .attr("r", 3)
      .attr("fill", "#3b82f6")
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

  }, [results, viewMode]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Forecast Results</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('simple')}
            className={`px-3 py-1 rounded-md ${
              viewMode === 'simple'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1 rounded-md ${
              viewMode === 'comparison'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            Comparison
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          className="w-full h-[400px] bg-white dark:bg-slate-800"
        />
        <div
          ref={tooltipRef}
          className="absolute opacity-0 pointer-events-none bg-slate-800 text-white px-2 py-1 rounded text-sm"
        />
      </div>

      {viewMode === 'comparison' && (
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
            <span className="text-slate-600 dark:text-slate-300">Forecast</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            <span className="text-slate-600 dark:text-slate-300">Baseline</span>
          </div>
        </div>
      )}
    </section>
  );
};