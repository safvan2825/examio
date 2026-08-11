import React from 'react';
import {LayoutDashboard,Settings,LogOut,ChevronDown,GraduationCap,Users,BookOpen,CalendarDays,ShieldCheck,UserRound} from 'lucide-react';
import {Campus} from '../types/tenant';
export type ShellTab='dashboard'|'categories'|'classes'|'students'|'subjects'|'teachers'|'examinations'|'settings';
interface Props{activeTab:ShellTab;onTabChange:(t:ShellTab)=>void;campus:Campus;campuses:Campus[];onCampusChange:(c:Campus)=>void;onMyCampuses:()=>void;onLogout:()=>void;}
export const AppSidebarV2:React.FC<Props>=({activeTab,onTabChange,campus,onMyCampuses,onLogout})=><aside className="examio-sidebar">
 <div className="examio-brand"><div className="examio-brand-mark"><ShieldCheck/></div><div><strong>Examio</strong><span>Examination Management</span></div></div>
 <button className="examio-campus-switch" onClick={onMyCampuses}><span>CAMPUS</span><strong>{campus.name}</strong><small><ChevronDown/> Switch campus</small></button>
 <nav className="examio-nav">
  <div className="examio-nav-label">WORKSPACE</div><Item number="01" active={activeTab==='dashboard'} icon={LayoutDashboard} label="Dashboard" onClick={()=>onTabChange('dashboard')}/><Item number="02" active={activeTab==='examinations'} icon={CalendarDays} label="Examinations" onClick={()=>onTabChange('examinations')}/>
  <div className="examio-nav-label">CAMPUS DATA</div><Item number="03" active={activeTab==='classes'} icon={GraduationCap} label="Classes" onClick={()=>onTabChange('classes')}/><Item number="04" active={activeTab==='students'} icon={Users} label="Students" onClick={()=>onTabChange('students')}/><Item number="05" active={activeTab==='subjects'} icon={BookOpen} label="Subjects" onClick={()=>onTabChange('subjects')}/><Item number="06" active={activeTab==='teachers'} icon={UserRound} label="Teachers" onClick={()=>onTabChange('teachers')}/>
  <div className="examio-nav-label">ADMIN</div><Item number="07" active={activeTab==='settings'} icon={Settings} label="Settings" onClick={()=>onTabChange('settings')}/>
 </nav>
 <button className="examio-signout" onClick={onLogout}><LogOut/> <span>Sign out</span></button>
 </aside>;
const Item=({number,active,icon:Icon,label,onClick}:{number:string;active:boolean;icon:any;label:string;onClick:()=>void})=><button onClick={onClick} className={`examio-nav-item ${active?'active':''}`}><span className="examio-nav-number">{number}</span><Icon/>{label}</button>;
