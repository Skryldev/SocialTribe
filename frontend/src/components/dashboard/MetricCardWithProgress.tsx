import React from 'react';
import {
  PieChart, Pie, Cell,
  AreaChart, Area,
  BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { Activity, LucideIcon } from 'lucide-react';
import './MetricCardWithProgress.css';

const STRENGTH_MAP: any = { weak:'strength-weak', moderate:'strength-moderate', strong:'strength-strong', excellent:'strength-excellent', assortative:'strength-strong', disassortative:'strength-weak', neutral:'strength-moderate' };
const getStrengthClass = (s: string): string => STRENGTH_MAP[s] || 'strength-moderate';
const safeFmt = (v: any, fn: (v: number) => string): string => { if (v===undefined||v===null) return '—'; if (typeof v!=='number') return String(v); try {return fn(v)} catch {return 'err'} };
const pct = (v: number, max: number): number => max>0 ? Math.min((v/max)*100, 100) : 0;
const toNum = (v: any): number => { const n = v===undefined||v===null ? 0 : Number(v); return isNaN(n) ? 0 : n };

interface HdrProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
}

const Hdr = ({ icon: IconComponent, title, subtitle }: HdrProps) => (
  <div className="mcp-header">
    <span className="mcp-icon">
      {IconComponent ? <IconComponent size={17} strokeWidth={1.5} /> : <Activity size={17} strokeWidth={1.5} />}
    </span>
    <div className="mcp-title-wrap">
      <h3 className="mcp-title">{title||'Metric'}</h3>
      {subtitle && <p className="mcp-subtitle">{subtitle}</p>}
    </div>
  </div>
);

interface ValProps {
  value: any;
  maxValue?: number;
  formatValue?: (v: number) => string;
  prefix?: string;
  suffix?: string;
}

const Val = ({ value, maxValue, formatValue, prefix, suffix }: ValProps) => (
  <div className="mcp-value-row">
    {prefix && <span className="mcp-prefix">{prefix}</span>}
    <span className="mcp-value">{safeFmt(value, formatValue||((v: number)=>v.toFixed(4)))}</span>
    {maxValue!==undefined && <span className="mcp-max">/ {maxValue}</span>}
    {suffix && <span className="mcp-suffix">{suffix}</span>}
  </div>
);

interface BadgeProps {
  text?: string;
  strength?: string;
}

const Badge = ({ text, strength }: BadgeProps) => text ? (
  <div className={`mcp-badge ${getStrengthClass(strength||'moderate')}`}><span className="mcp-badge-dot"/>{text}</div>
) : null;

interface ChartBoxProps {
  children: React.ReactNode;
  height?: number;
}

const ChartBox = ({ children, height = 100 }: ChartBoxProps) => (
  <div style={{ width:'100%', height, minHeight:height, position:'relative', flexShrink:0 }}>
    <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
  </div>
);

interface RadialGaugeProps {
  value: number;
  displayValue: number;
  color: string;
  label: string;
  sublabel: string;
}

const RadialGauge = ({ displayValue, color, label, sublabel }: RadialGaugeProps) => {
  const pctVal = Math.min(Math.max(displayValue, 0), 100);
  const radius = 50;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (pctVal / 100) * circumference;

  return (
    <div className="mcp-radial-wrap">
      <svg width="100%" height="120" viewBox="0 0 120 80">
        <path
          d={`M ${60 - radius} 65 A ${radius} ${radius} 0 0 1 ${60 + radius} 65`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${60 - radius} 65 A ${radius} ${radius} 0 0 1 ${60 + radius} 65`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="mcp-radial-center">
        <span className="mcp-radial-val">{label}</span>
        <span className="mcp-radial-pct">{sublabel}</span>
      </div>
    </div>
  );
};

interface ClusteringBreakdownProps {
  icon?: LucideIcon;
  title?: string;
  globalCC: any;
  avgLocalCC: any;
  interpretation?: string;
  strength?: string;
}

const ClusteringBreakdown = (props: ClusteringBreakdownProps) => {
  const { icon, title, globalCC, avgLocalCC, interpretation, strength } = props;
  const gcc = toNum(globalCC), lcc = toNum(avgLocalCC), gap = Math.abs(gcc - lcc);
  const insight = gap>0.3 ? 'Hierarchical — groups within groups' : gap>0.1 ? 'Mixed — some local clusters' : 'Uniform — evenly connected';

  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Clustering'} subtitle={insight}/>
      <div style={{display:'flex', gap:16, alignItems:'center'}}>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{fontSize:28, fontWeight:700, color:'#f59e0b', fontFamily:'JetBrains Mono,monospace'}}>{gcc.toFixed(3)}</div>
          <div style={{fontSize:9, color:'#94a3b8', textTransform:'uppercase'}}>Global CC</div>
        </div>
        <div style={{width:1, height:40, background:'#334155'}}/>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{fontSize:28, fontWeight:700, color:'#ea580c', fontFamily:'JetBrains Mono,monospace'}}>{lcc.toFixed(3)}</div>
          <div style={{fontSize:9, color:'#94a3b8', textTransform:'uppercase'}}>Avg Local CC</div>
        </div>
      </div>
      <div className="mcp-bar-track">
        <div className={`mcp-bar-fill ${getStrengthClass(gap>0.3?'weak':gap>0.1?'moderate':'strong')}`} style={{width:`${Math.min(gap*200+10,100)}%`}}/>
      </div>
      <Badge text={interpretation||(gcc>0.3?'Non-trivial clustering':'Low clustering')} strength={strength||(gcc>0.3?'strong':'weak')}/>
    </div>
  );
};

interface ModularityGaugeProps {
  icon?: LucideIcon;
  title?: string;
  value: any;
  maxValue?: any;
  communityCount?: number;
  interpretation?: string;
  strength?: string;
}

const ModularityGauge = (props: ModularityGaugeProps) => {
  const { icon, title, value, maxValue, communityCount, interpretation, strength } = props;
  const v = toNum(value), mx = toNum(maxValue||1), p = pct(v, mx);
  const color = v > 0.5 ? '#10b981' : v > 0.3 ? '#f59e0b' : v > 0.1 ? '#f97316' : '#ef4444';

  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Modularity'} subtitle={`${communityCount||'?'} communities detected`}/>
      <RadialGauge value={v} displayValue={p} color={color} label={safeFmt(v,(v: number)=>v.toFixed(3))} sublabel={`${p.toFixed(0)}%`}/>
      <Badge text={interpretation} strength={strength}/>
    </div>
  );
};

interface CentralityDominanceProps {
  icon?: LucideIcon;
  title?: string;
  topNode?: string;
  topValue: any;
  restValue: any;
  interpretation?: string;
  strength?: string;
}

const CentralityDominance = (props: CentralityDominanceProps) => {
  const { icon, title, topNode, topValue, restValue, interpretation, strength } = props;
  const tv=toNum(topValue), rv=toNum(restValue), dom=tv+rv>0?(tv/(tv+rv))*100:100;
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Eigenvector Dominance'} subtitle={dom>70?`"${topNode}" dominates`:dom>40?'Moderate centralization':'Power distributed'}/>
      <div className="mcp-donut-wrap">
        <ResponsiveContainer width="100%" height={110}><PieChart><Pie data={[{name:topNode||'Top',value:tv},{name:'Rest',value:rv}]} innerRadius={30} outerRadius={45} paddingAngle={4} dataKey="value" cornerRadius={8}><Cell fill="#fbbf24"/><Cell fill="#334155"/></Pie><RechartsTooltip/></PieChart></ResponsiveContainer>
        <div className="mcp-donut-center">{dom.toFixed(0)}%</div>
      </div>
      <Badge text={interpretation} strength={strength}/>
    </div>
  );
};

interface AssortativityAnalysisProps {
  icon?: LucideIcon;
  title?: string;
  value: any;
  avgDegree: any;
  interpretation?: string;
  strength?: string;
}

const AssortativityAnalysis = (props: AssortativityAnalysisProps) => {
  const { icon, title, value, avgDegree, interpretation, strength } = props;
  const r=toNum(value), ad=toNum(avgDegree);
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Assortativity'} subtitle={r>0.2?'Hubs connect to hubs':r<-0.2?'Hubs connect to leaves':'Random mixing'}/>
      <Val value={value} formatValue={(v: number)=>`${toNum(v)>0?'+':''}${toNum(v).toFixed(4)}`} suffix="Pearson r"/>
      <div className="mcp-bar-track"><div className={`mcp-bar-fill ${getStrengthClass(r>0.2?'strong':r<-0.2?'weak':'moderate')}`} style={{width:`${Math.min(Math.abs(r)*100+50,100)}%`}}/></div>
      <p className="mcp-subtitle">Avg degree: {safeFmt(ad,(v: number)=>v.toFixed(1))}</p>
      <Badge text={interpretation} strength={strength}/>
    </div>
  );
};

interface RobustnessSparklineProps {
  icon?: LucideIcon;
  title?: string;
  data?: any[];
  interpretation?: string;
  strength?: string;
}

const RobustnessSparkline = (props: RobustnessSparklineProps) => {
  const { icon, title, data, interpretation, strength } = props;
  if (!data?.length) return <div className="mcp-card"><Hdr icon={icon} title={title||'Robustness'}/><p className="mcp-subtitle">No data</p></div>;
  const first=toNum(data[0]?.component), last=toNum(data[data.length-1]?.component), drop=first>0?((first-last)/first)*100:0;
  const gradientId = React.useId();
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Robustness'} subtitle={`${drop.toFixed(0)}% drop after targeted removal`}/>
      <ChartBox height={55}><AreaChart data={data} margin={{top:5,right:5,bottom:0,left:0}}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs><Area dataKey="component" stroke="#ef4444" fill={`url(#${gradientId})`} strokeWidth={2} dot={false}/></AreaChart></ChartBox>
      <Badge text={interpretation||(drop<20?'Resilient':drop<50?'Fragile':'Critical')} strength={strength||(drop<20?'excellent':drop<50?'moderate':'weak')}/>
    </div>
  );
};

interface DegreeTopSpreadProps {
  icon?: LucideIcon;
  title?: string;
  data?: any[];
  avgDegree: any;
  interpretation?: string;
  strength?: string;
}

const DegreeTopSpread = (props: DegreeTopSpreadProps) => {
  const { icon, title, data, avgDegree, interpretation, strength } = props;
  if (!data?.length) return <div className="mcp-card"><Hdr icon={icon} title={title||'Degree Spread'}/><p className="mcp-subtitle">No data</p></div>;
  const ad = toNum(avgDegree), maxDeg = Math.max(...data.map((d: any)=>toNum(d.degree)),1);
  const chartData = data.slice(0,6).map((d: any)=>({name:(d.name||'').length>12?(d.name||'').substring(0,11)+'…':(d.name||'?'),degree:toNum(d.degree),fill:toNum(d.degree)===maxDeg?'#fbbf24':toNum(d.degree)>=maxDeg*0.6?'#f59e0b':'#b45309'}));
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Degree Distribution'} subtitle={`Avg: ${safeFmt(ad,(v: number)=>v.toFixed(1))} | Max: ${maxDeg}`}/>
      <ChartBox height={Math.max(chartData.length*28,80)}>
        <BarChart data={chartData} layout="vertical" margin={{top:0,right:5,bottom:0,left:0}}>
        <XAxis type="number" hide/><YAxis type="category" dataKey="name" width={90} tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
      <Bar 
        dataKey="degree" 
        radius={[0,4,4,0]} 
        barSize={16} 
        label={{
          position: 'right',
          fontSize: 10,
          fill: '#e2e8f0',
          formatter: (v: any) => v as any
        }}
      >
        {chartData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
      </Bar>
      </BarChart>
      </ChartBox>
      <Badge text={interpretation||(maxDeg>ad*3?'Hub-dominated':maxDeg>ad*1.5?'Moderate spread':'Uniform')} strength={strength}/>
    </div>
  );
};

interface PowerLawDiagnosticProps {
  icon?: LucideIcon;
  title?: string;
  value: any;
  isScaleFree?: boolean;
  rSquared?: number;
  interpretation?: string;
  strength?: string;
}

const PowerLawDiagnostic = (props: PowerLawDiagnosticProps) => {
  const { icon, title, value, isScaleFree, rSquared, interpretation, strength } = props;
  const alpha=toNum(value), inRange=alpha>2&&alpha<3, hasValue=value!==null&&value!==undefined;
  return (
    <div className="mcp-card mcp-card-power">
      <Hdr icon={icon} title={title||'Power-law'} subtitle={hasValue?(inRange?'Scale-free detected':alpha>=3?'Thin-tailed':'Heavy-tailed'):'Insufficient data — need ≥6 nodes'}/>
      <div className="mcp-power-val">{hasValue?`α = ${safeFmt(value,(v: number)=>v.toFixed(3))}`:'α = N/A'}</div>
      {hasValue && rSquared!==undefined && rSquared>0 && <div className="mcp-confidence"><div className="mcp-confidence-fill" style={{width:`${Math.min(toNum(rSquared)*100,100)}%`}}/><span>R²={safeFmt(rSquared,(v: number)=>v.toFixed(3))}</span></div>}
      {isScaleFree && <span className="mcp-scale-badge">Scale-free</span>}
      <Badge text={interpretation||(hasValue?(inRange?'Scale-free':'Not scale-free'):'N/A')} strength={strength||(inRange?'excellent':'moderate')}/>
    </div>
  );
};

interface ComponentHealthProps {
  icon?: LucideIcon;
  title?: string;
  largestSize: any;
  totalNodes: any;
  componentCount: any;
  interpretation?: string;
  strength?: string;
}

const ComponentHealth = (props: ComponentHealthProps) => {
  const { icon, title, largestSize, totalNodes, componentCount, interpretation, strength } = props;
  const ls=toNum(largestSize), tn=toNum(totalNodes), cc=toNum(componentCount), pctL=tn>0?(ls/tn)*100:100;
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Component Health'} subtitle={`${cc||'?'} components`}/>
      <div className="mcp-donut-wrap">
        <ResponsiveContainer width="100%" height={110}><PieChart><Pie data={[{name:'Largest',value:ls},{name:'Fragments',value:Math.max(0,tn-ls)}]} innerRadius={30} outerRadius={45} paddingAngle={4} dataKey="value" cornerRadius={8}><Cell fill="#10b981"/><Cell fill="#334155"/></Pie><RechartsTooltip/></PieChart></ResponsiveContainer>
        <div className="mcp-donut-center">{pctL.toFixed(0)}%</div>
      </div>
      <Badge text={interpretation||(pctL>90?'Connected':pctL>60?'Dominant':'Fragmented')} strength={strength||(pctL>90?'excellent':pctL>60?'moderate':'weak')}/>
    </div>
  );
};

interface DiameterInsightProps {
  icon?: LucideIcon;
  title?: string;
  diameter: any;
  avgPathLength: any;
  distanceData?: any[];
  interpretation?: string;
  strength?: string;
}

const DiameterInsight = (props: DiameterInsightProps) => {
  const { icon, title, diameter, avgPathLength, distanceData, interpretation, strength } = props;
  const d=toNum(diameter), apl=toNum(avgPathLength), smallWorld=d<6&&apl<3;
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Path Length'} subtitle={smallWorld?'Small-world confirmed':d>10?'Large world':'Typical network'}/>
      <Val value={d} formatValue={(v: number)=>v.toFixed(0)} suffix="diameter"/>
      <p className="mcp-subtitle">Avg path: {safeFmt(apl,(v: number)=>v.toFixed(2))}</p>
      {distanceData?.length && distanceData.length > 0 && (
        <ChartBox height={40}>
          <BarChart 
            data={distanceData.slice(0,8)} 
            margin={{top:0,right:5,bottom:0,left:0}}
          >
            <Bar dataKey="count" fill="#06b6d4" radius={[3,3,0,0]} />
          </BarChart>
        </ChartBox>
      )}
      <Badge text={interpretation||(smallWorld?'Small-world':d>10?'Large-world':'Typical')} strength={strength||(smallWorld?'excellent':d>10?'weak':'moderate')}/>
    </div>
  );
};

interface DensityGaugeProps {
  icon?: LucideIcon;
  title?: string;
  value: any;
  interpretation?: string;
  strength?: string;
}

const DensityGauge = (props: DensityGaugeProps) => {
  const { icon, title, value, interpretation, strength } = props;
  const den = toNum(value);
  const displayVal = den * 100;
  const color = den > 0.5 ? '#10b981' : den > 0.2 ? '#f59e0b' : den > 0.1 ? '#f97316' : '#ef4444';

  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Density'} subtitle={den>0.5?'Nearly complete graph':den>0.2?'Dense':den>0.1?'Moderate':'Sparse'}/>
      <RadialGauge value={den} displayValue={displayVal} color={color} label={safeFmt(den,(v: number)=>v.toFixed(4))} sublabel={`${(den*100).toFixed(1)}%`}/>
      <Badge text={interpretation} strength={strength}/>
    </div>
  );
};

interface BridgeDetectionProps {
  icon?: LucideIcon;
  title?: string;
  data?: any[];
  interpretation?: string;
  strength?: string;
}

const BridgeDetection = (props: BridgeDetectionProps) => {
  const { icon, title, data, interpretation, strength } = props;
  if (!data?.length) return <div className="mcp-card"><Hdr icon={icon} title={title||'Bridge Detection'}/><p className="mcp-subtitle">No data</p></div>;
  const top5 = data.slice(0,5), maxVal = Math.max(...top5.map((d: any)=>toNum(d.value)),0.001);
  const topVal=toNum(top5[0]?.value), secondVal=toNum(top5[1]?.value), gap=secondVal>0?topVal/secondVal:99;
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Bridge Detection'} subtitle={gap>3?'Critical single point of failure':gap>1.5?'Key intermediaries':'Redundant — resilient'}/>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {top5.map((item: any,i: number)=>{
          const val=toNum(item.value), barW=maxVal>0?(val/maxVal)*100:0;
          const name=(item.name||'').length>14?(item.name||'').substring(0,13)+'…':(item.name||'?');
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:10,fontWeight:700,color:i===0?'#ef4444':i===1?'#f97316':'#64748b',width:18,textAlign:'right',flexShrink:0}}>#{i+1}</span>
              <span style={{fontSize:11,color:'#e2e8f0',width:90,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={item.name}>{name}</span>
              <div style={{flex:1,height:12,background:'#1e293b',borderRadius:6,overflow:'hidden'}}><div style={{height:'100%',width:`${barW}%`,background:i===0?'#ef4444':i===1?'#f97316':'#334155',borderRadius:6,transition:'width .6s'}}/></div>
              <span style={{fontSize:10,fontWeight:600,color:'#fbbf24',width:45,textAlign:'right',flexShrink:0,fontFamily:'JetBrains Mono,monospace'}}>{val.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
      <Badge text={interpretation||(gap>3?'Critical bridge':gap>1.5?'Key bridges':'Redundant')} strength={strength||(gap>3?'weak':gap>1.5?'moderate':'excellent')}/>
    </div>
  );
};

interface NetworkSummaryProps {
  icon?: LucideIcon;
  title?: string;
  nodes: any;
  edges: any;
  density: any;
  avgDegree: any;
  diameter: any;
  components: any;
  interpretation?: string;
  strength?: string;
}

const NetworkSummary = (props: NetworkSummaryProps) => {
  const { icon, title, nodes, edges, density, avgDegree, diameter, components, interpretation, strength } = props;
  const n=toNum(nodes), e=toNum(edges), d=toNum(density), ad=toNum(avgDegree), dia=toNum(diameter), comp=toNum(components);
  const s: [string, string][] = [['Nodes',n.toLocaleString()],['Edges',e.toLocaleString()],['Avg Deg',safeFmt(ad,(v: number)=>v.toFixed(1))],['Density',safeFmt(d,(v: number)=>v.toFixed(3))],['Ø',String(dia)],['Comps',String(comp)]];
  return (
    <div className="mcp-card">
      <Hdr icon={icon} title={title||'Summary'} subtitle="Key indicators"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{s.map(([l,v]: [string, string],i: number)=><div key={i} style={{background:'rgba(245,158,11,0.08)',borderRadius:8,padding:'8px 6px',textAlign:'center'}}><div style={{fontSize:15,fontWeight:700,color:'#e2e8f0',fontFamily:'JetBrains Mono,monospace'}}>{v}</div><div style={{fontSize:9,color:'#94a3b8',textTransform:'uppercase'}}>{l}</div></div>)}</div>
      <Badge text={interpretation||(comp===1?'Connected':`${comp} components`)} strength={strength||(comp===1?'excellent':'moderate')}/>
    </div>
  );
};

const VARIANT_MAP: any = { clustering:ClusteringBreakdown, modularity:ModularityGauge, 'centrality-dom':CentralityDominance, assortativity:AssortativityAnalysis, robustness:RobustnessSparkline, 'degree-spread':DegreeTopSpread, 'power-law':PowerLawDiagnostic, component:ComponentHealth, diameter:DiameterInsight, density:DensityGauge, bridge:BridgeDetection, summary:NetworkSummary };

interface MetricCardWithProgressProps {
  variant: string;
  [key: string]: any;
}

const MetricCardWithProgress = (props: MetricCardWithProgressProps): React.ReactElement => { const V = VARIANT_MAP[props.variant]||ClusteringBreakdown; return <V {...props}/>; };
export default MetricCardWithProgress;