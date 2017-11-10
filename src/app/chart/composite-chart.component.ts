import { AfterViewInit, ElementRef, Component, Input, OnChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import * as D3 from 'd3';
import * as moment from 'moment';
import { Observable } from 'rxjs';

import { DataPoint } from '../state/data-point.model';
import { DataSet } from '../state/data-set.model';

@Component({
  selector: 'irl-component-composite-chart',
  templateUrl: './composite-chart.component.html',
  styleUrls: ['./composite-chart.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class CompositeChartComponent implements OnChanges, AfterViewInit {

  @Input()
  dataSet: DataSet;

  @ViewChild('container') 
  element: ElementRef;

  private htmlElement: HTMLElement;
  private host: any;
  private margin: any;
  private dimensions: any;
  private tooltip: any;

  constructor() {
    console.log('LineChartComponent:constructor');
  }

  ngAfterViewInit(): void {
    console.log('LineChartComponent:ngAfterViewInit');

    this.htmlElement = this.element.nativeElement;
    
    this.host = D3.select(this.htmlElement);

    this.margin = {top: 40, right: 50, bottom: 30, left: 50};

    this.drawChart();

    let self = this;

    Observable.interval(100).subscribe((x) => {
      if (!self.dimensions) {
        self.dimensions = {width: this.htmlElement.offsetWidth, height: this.htmlElement.offsetHeight};
      } else if (self.dimensions.width != this.htmlElement.offsetWidth || self.dimensions.height != this.htmlElement.offsetHeight) {
        self.dimensions = {width: this.htmlElement.offsetWidth, height: this.htmlElement.offsetHeight};
        
        self.drawChart();
      }
    });
  }

  ngOnChanges(): void {
    console.log('LineChartComponent:ngOnChanges');

    this.drawChart();
  }

  private drawChart(): void {
    if (this.dataSet.points.length > 0) {
      this.doDrawChart();
    } 
  }

  private doDrawChart(): void {
    this.host.html('');    

    this.tooltip = D3.select("body").append("div").attr("class", "toolTip");

    let width = this.htmlElement.offsetWidth - this.margin.left - this.margin.right;
    let height = this.htmlElement.offsetHeight - this.margin.top - this.margin.bottom;
    
    let svg = this.host.append('svg')
      .attr('width', width + this.margin.left + this.margin.right)
      .attr('height', height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    let xScaleCumulative = D3.scaleTime().range([0, width]);
    let xScaleMonthly = D3.scaleBand().padding(0.1).align(.5).domain([]).round(false).range([1, width]);
    let yScaleLeft = D3.scaleLinear().range([height, 0]);
    let yScaleRight = D3.scaleLinear().range([height, 0]);

    let self = this;

    xScaleCumulative.domain(D3.extent(this.dataSet.points, function(d: any) { return self.parseDate(d.date); }));
    xScaleMonthly.domain(this.dataSet.points.map(d => this.formatDate(d.date)));
    yScaleLeft.domain([0, D3.max(this.dataSet.points, d => d.monthly)]);
    yScaleRight.domain([0, D3.max(this.dataSet.points, d => d.cumulative)]);

    this.drawXAxis(svg, xScaleMonthly, width, height);

    this.drawYAxes(svg, yScaleLeft, yScaleRight, width);

    this.drawBars(svg, xScaleMonthly, yScaleLeft, height);

    this.drawLine(svg, xScaleCumulative, yScaleRight);
  }

  private drawXAxis(svg: any, scale: any, width: number, height: number): void {    
    const numTicks = Math.floor(width / 50);
    const factor = this.dataSet.points.length == 0 ? 0 : Math.floor(this.dataSet.points.length / numTicks) + 1;

    const tickFilter = function (d, i) {
      return i % factor == 0;
    };
    
    let xAxis = D3.axisBottom(scale).tickValues(scale.domain().filter(tickFilter));

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);
  }

  private drawYAxes(svg: any, scaleLeft: any, scaleRight: any, width: number): void {
    let yAxisLeft = D3.axisLeft(scaleLeft);
    let yAxisRight = D3.axisRight(scaleRight);
    
    svg.append('g')
        .attr('class', 'y axis')
        .attr('transform', `translate(${width}, 0)`)
        .call(yAxisRight)
        .append('text')
        .attr('y', -12)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('Total miles');

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxisLeft)
        .append('text')
        .attr('y', -12)
        .attr('x', 71)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text('Miles per month');
  }

  private drawBars(svg: any, xScale: any, yScale: any, height: number): void {
    let chart = svg.append('g')
      .attr('class', 'bars');

    const update = chart.selectAll('.chart-bar')
      .data(this.dataSet.points);

    update.exit().remove();

    chart.selectAll('.chart-bar').transition()
      .attr('x', d => xScale(this.formatDate(d.date)))
      .attr('y', d => yScale(d.monthly))
      .attr('width', d => xScale.bandwidth())
      .attr('height', d => height - yScale(d.monthly));

    let self = this;

    update.enter()
      .append('rect')
      .attr('class', 'chart-bar')
      .attr('x', d => xScale(this.formatDate(d.date)))
      .attr('y', d => yScale(0))
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .on("mouseover", function () {
        self.tooltip.style("display", "inline-block");
      })
      .on("mouseout", function (d) {
        self.tooltip.style("display", "none");
      })
      .on("mousemove", function (d) {
        const x = this.x.baseVal.value + self.margin.left + this.width.baseVal.value / 2;
        const y = this.y.baseVal.value;
        const topp = self.element.nativeElement.offsetTop;

        self.tooltip
          .style("left", x - 40 + "px")
          .style("top", topp + 4 + y + "px")
          .html('<div class="toolTipLabel">' + (self.formatDate(d.date)) + '</div><div class="toolTipValue">' + (d.monthlyFormatted) + '</div>');
      })
      .transition()
      .delay((d, i) => i * 10)
      .attr('y', d => yScale(d.monthly))
      .attr('height', d => height - yScale(d.monthly));
  }

  private drawLine(svg: any, xScale: any, yScale: any): void {
    let self = this;

    let line = D3.line()
      .curve(D3.curveBasis)
      .x(function(d: any) { return xScale(self.parseDate(d.date)); })
      .y(function(d: any) { return yScale(d.cumulative); });

    svg.append('path')
      .datum(this.dataSet.points)
      .attr('class', 'line')
      .attr('d', line);
  }

  private parseDate(string: string): Date {
    return D3.timeParse('%m-%d-%Y')(string);
  }

  private formatDate(string: string): string {
    return moment(string, 'MM-DD-YYYY').format('MMM \'YY');
  }

}