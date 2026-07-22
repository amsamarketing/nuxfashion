import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { getErr } from '../../lib/err';

// ── helpers ──────────────────────────────────────────────────────────────────
const sar = (n: number) => 'SAR ' + Number(n).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const badge = (s: string) => {
  const map: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-gray-100 text-gray-600', terminated: 'bg-red-100 text-red-600', pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600', draft: 'bg-gray-100 text-gray-600', paid: 'bg-blue-100 text-blue-700', present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-600', late: 'bg-amber-100 text-amber-700', on_leave: 'bg-purple-100 text-purple-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s.replace('_',' ')}</span>;
};
const Input = ({ label, ...p }: any) => <div><label className="block text-xs text-gray-500 mb-1">{label}</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" {...p} /></div>;
const Select = ({ label, children, ...p }: any) => <div><label className="block text-xs text-gray-500 mb-1">{label}</label><select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" {...p}>{children}</select></div>;
const Modal = ({ title, onClose, children }: any) => <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between p-5 border-b"><h3 className="font-semibold text-gray-800">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div><div className="p-5 space-y-4">{children}</div></div></div>;
const TABS = ['Employees','Departments','Attendance','Leave','Payroll'];

export default function HR() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Employees');
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">HR & Payroll</h1>
      <div className="flex gap-1 border-b">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===t?'border-indigo-500 text-indigo-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>)}
      </div>
      {tab==='Employees' && <EmployeesTab toast={toast} qc={qc} />}
      {tab==='Departments' && <DepartmentsTab toast={toast} qc={qc} />}
      {tab==='Attendance' && <AttendanceTab toast={toast} qc={qc} />}
      {tab==='Leave' && <LeaveTab toast={toast} qc={qc} />}
      {tab==='Payroll' && <PayrollTab toast={toast} qc={qc} />}
    </div>
  );
}

// ── Employees ────────────────────────────────────────────────────────────────
const EMP0 = { firstName:'', lastName:'', email:'', phone:'', joiningDate:new Date().toISOString().split('T')[0], basicSalary:'', departmentId:'', designationId:'', gender:'male', status:'active', nationalId:'', bankName:'', bankAccount:'' };
function EmployeesTab({ toast, qc }: any) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({...EMP0});
  const f = (k: string, v: string) => setForm(p => ({...p, [k]: v}));
  const { data: emps = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: desigs = [] } = useQuery({ queryKey: ['designations'], queryFn: () => api.get('/designations').then(r => r.data) });
  const save = useMutation({ mutationFn: () => edit ? api.put(`/employees/${edit.id}`, { ...form, basicSalary: Number(form.basicSalary) }) : api.post('/employees', { ...form, basicSalary: Number(form.basicSalary) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast('Saved'); setShow(false); setEdit(null); setForm({...EMP0}); }, onError: (e: any) => toast(getErr(e), 'error') });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/employees/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast('Deleted'); }, onError: (e: any) => toast(getErr(e), 'error') });
  const open = (emp?: any) => { if (emp) { setEdit(emp); setForm({ firstName: emp.first_name, lastName: emp.last_name, email: emp.email, phone: emp.phone||'', joiningDate: emp.joining_date?.split('T')[0]||'', basicSalary: emp.basic_salary||'', departmentId: emp.department_id||'', designationId: emp.designation_id||'', gender: emp.gender||'male', status: emp.status||'active', nationalId: emp.national_id||'', bankName: emp.bank_name||'', bankAccount: emp.bank_account||'' }); } else { setEdit(null); setForm({...EMP0}); } setShow(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{emps.length} employees</p>
        <button onClick={() => open()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Employee</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>{['ID','Name','Department','Designation','Salary','Status',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emps.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">{e.employee_id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{e.first_name} {e.last_name}<div className="text-xs text-gray-400">{e.email}</div></td>
                <td className="px-4 py-3 text-gray-600">{e.department_name||'—'}</td>
                <td className="px-4 py-3 text-gray-600">{e.designation_name||'—'}</td>
                <td className="px-4 py-3 font-medium">{sar(e.basic_salary)}</td>
                <td className="px-4 py-3">{badge(e.status)}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => open(e)} className="text-indigo-600 hover:underline text-xs">Edit</button><button onClick={() => { if(confirm('Delete?')) del.mutate(e.id); }} className="text-red-500 hover:underline text-xs">Del</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && <Modal title={edit ? 'Edit Employee' : 'Add Employee'} onClose={() => setShow(false)}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" value={form.firstName} onChange={(e: any) => f('firstName', e.target.value)} />
          <Input label="Last Name" value={form.lastName} onChange={(e: any) => f('lastName', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e: any) => f('email', e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(e: any) => f('phone', e.target.value)} />
          <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e: any) => f('joiningDate', e.target.value)} />
          <Input label="Basic Salary (SAR)" type="number" value={form.basicSalary} onChange={(e: any) => f('basicSalary', e.target.value)} />
          <Select label="Department" value={form.departmentId} onChange={(e: any) => f('departmentId', e.target.value)}><option value="">— Select —</option>{depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          <Select label="Designation" value={form.designationId} onChange={(e: any) => f('designationId', e.target.value)}><option value="">— Select —</option>{desigs.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          <Select label="Gender" value={form.gender} onChange={(e: any) => f('gender', e.target.value)}><option value="male">Male</option><option value="female">Female</option></Select>
          <Select label="Status" value={form.status} onChange={(e: any) => f('status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option></Select>
          <Input label="National ID" value={form.nationalId} onChange={(e: any) => f('nationalId', e.target.value)} />
          <Input label="Bank Name" value={form.bankName} onChange={(e: any) => f('bankName', e.target.value)} />
          <div className="col-span-2"><Input label="Bank Account" value={form.bankAccount} onChange={(e: any) => f('bankAccount', e.target.value)} /></div>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">{save.isPending ? 'Saving...' : 'Save'}</button>
      </Modal>}
    </div>
  );
}

// ── Departments ───────────────────────────────────────────────────────────────
function DepartmentsTab({ toast, qc }: any) {
  const [showD, setShowD] = useState(false);
  const [editD, setEditD] = useState<any>(null);
  const [formD, setFormD] = useState({ name: '', description: '' });
  const [showDes, setShowDes] = useState(false);
  const [editDes, setEditDes] = useState<any>(null);
  const [formDes, setFormDes] = useState({ name: '', departmentId: '', description: '' });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: desigs = [] } = useQuery({ queryKey: ['designations'], queryFn: () => api.get('/designations').then(r => r.data) });
  const saveD = useMutation({ mutationFn: () => editD ? api.put(`/departments/${editD.id}`, formD) : api.post('/departments', formD), onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast('Saved'); setShowD(false); setEditD(null); setFormD({ name: '', description: '' }); }, onError: (e: any) => toast(getErr(e), 'error') });
  const delD = useMutation({ mutationFn: (id: string) => api.delete(`/departments/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast('Deleted'); }, onError: (e: any) => toast(getErr(e), 'error') });
  const saveDes = useMutation({ mutationFn: () => editDes ? api.put(`/designations/${editDes.id}`, formDes) : api.post('/designations', formDes), onSuccess: () => { qc.invalidateQueries({ queryKey: ['designations'] }); toast('Saved'); setShowDes(false); setEditDes(null); setFormDes({ name: '', departmentId: '', description: '' }); }, onError: (e: any) => toast(getErr(e), 'error') });
  const delDes = useMutation({ mutationFn: (id: string) => api.delete(`/designations/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['designations'] }); toast('Deleted'); }, onError: (e: any) => toast(getErr(e), 'error') });
  const openD = (d?: any) => { if (d) { setEditD(d); setFormD({ name: d.name, description: d.description || '' }); } else { setEditD(null); setFormD({ name: '', description: '' }); } setShowD(true); };
  const openDes = (d?: any) => { if (d) { setEditDes(d); setFormDes({ name: d.name, departmentId: d.department_id || '', description: d.description || '' }); } else { setEditDes(null); setFormDes({ name: '', departmentId: '', description: '' }); } setShowDes(true); };
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Departments</h3>
          <button onClick={() => openD()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700">+ Add</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {depts.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50">
              <div><p className="font-medium text-sm text-gray-800">{d.name}</p><p className="text-xs text-gray-400">{d.description}</p></div>
              <div className="flex gap-2">
                <button onClick={() => openD(d)} className="text-indigo-600 text-xs hover:underline">Edit</button>
                <button onClick={() => { if (confirm('Delete?')) delD.mutate(d.id); }} className="text-red-500 text-xs hover:underline">Del</button>
              </div>
            </div>
          ))}
        </div>
        {showD && <Modal title={editD ? 'Edit Department' : 'Add Department'} onClose={() => setShowD(false)}>
          <div className="space-y-3">
            <Input label="Name" value={formD.name} onChange={(e: any) => setFormD(p => ({ ...p, name: e.target.value }))} />
            <Input label="Description" value={formD.description} onChange={(e: any) => setFormD(p => ({ ...p, description: e.target.value }))} />
          </div>
          <button onClick={() => saveD.mutate()} disabled={saveD.isPending} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">{saveD.isPending ? 'Saving...' : 'Save'}</button>
        </Modal>}
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Designations</h3>
          <button onClick={() => openDes()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700">+ Add</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {desigs.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-gray-50">
              <div><p className="font-medium text-sm text-gray-800">{d.name}</p><p className="text-xs text-gray-400">{d.department_name}</p></div>
              <div className="flex gap-2">
                <button onClick={() => openDes(d)} className="text-indigo-600 text-xs hover:underline">Edit</button>
                <button onClick={() => { if (confirm('Delete?')) delDes.mutate(d.id); }} className="text-red-500 text-xs hover:underline">Del</button>
              </div>
            </div>
          ))}
        </div>
        {showDes && <Modal title={editDes ? 'Edit Designation' : 'Add Designation'} onClose={() => setShowDes(false)}>
          <div className="space-y-3">
            <Input label="Name" value={formDes.name} onChange={(e: any) => setFormDes(p => ({ ...p, name: e.target.value }))} />
            <Select label="Department" value={formDes.departmentId} onChange={(e: any) => setFormDes(p => ({ ...p, departmentId: e.target.value }))}>
              <option value="">— Select —</option>
              {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Input label="Description" value={formDes.description} onChange={(e: any) => setFormDes(p => ({ ...p, description: e.target.value }))} />
          </div>
          <button onClick={() => saveDes.mutate()} disabled={saveDes.isPending} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">{saveDes.isPending ? 'Saving...' : 'Save'}</button>
        </Modal>}
      </div>
    </div>
  );
}

// ── Attendance ────────────────────────────────────────────────────────────────
function AttendanceTab({ toast, qc }: any) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const { data: emps = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });
  const { data: att = [] } = useQuery({ queryKey: ['attendance-date', date], queryFn: () => api.get(`/attendance/date/${date}`).then(r => r.data) });
  const STATUS_OPTS = ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday'];
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const getStatus = (empId: string) => { const rec = att.find((a: any) => a.employee_id === empId); return overrides[empId] ?? rec?.status ?? 'present'; };
  const bulk = useMutation({
    mutationFn: () => {
      const records = emps.filter((e: any) => e.status === 'active').map((e: any) => ({ employeeId: e.id, date, status: getStatus(e.id) }));
      return api.post('/attendance/bulk', { records });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance-date', date] }); toast('Attendance saved'); setOverrides({}); },
    onError: (e: any) => toast(getErr(e), 'error')
  });
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <Input label="Date" type="date" value={date} onChange={(e: any) => { setDate(e.target.value); setOverrides({}); }} />
        <button onClick={() => bulk.mutate()} disabled={bulk.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">{bulk.isPending ? 'Saving...' : 'Save Attendance'}</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr><th className="px-4 py-3 text-left">Employee</th><th className="px-4 py-3 text-left">Department</th><th className="px-4 py-3 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emps.filter((e: any) => e.status === 'active').map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{e.first_name} {e.last_name}<div className="text-xs text-gray-400">{e.employee_id}</div></td>
                <td className="px-4 py-3 text-gray-500 text-sm">{e.department_name || '—'}</td>
                <td className="px-4 py-3">
                  <select value={getStatus(e.id)} onChange={(ev) => setOverrides(p => ({ ...p, [e.id]: ev.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Leave ─────────────────────────────────────────────────────────────────────
function LeaveTab({ toast, qc }: any) {
  const [subTab, setSubTab] = useState('Requests');
  const { data: reqs = [] } = useQuery({ queryKey: ['leave-requests'], queryFn: () => api.get('/leave-requests').then(r => r.data) });
  const { data: types = [] } = useQuery({ queryKey: ['leave-types'], queryFn: () => api.get('/leave-types').then(r => r.data) });
  const { data: emps = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });
  const [showReq, setShowReq] = useState(false);
  const [formReq, setFormReq] = useState({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [showType, setShowType] = useState(false);
  const [formType, setFormType] = useState({ name: '', maxDaysPerYear: '', description: '' });
  const saveReq = useMutation({ mutationFn: () => api.post('/leave-requests', { ...formReq, startDate: formReq.startDate, endDate: formReq.endDate }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-requests'] }); toast('Request submitted'); setShowReq(false); setFormReq({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' }); }, onError: (e: any) => toast(getErr(e), 'error') });
  const saveType = useMutation({ mutationFn: () => api.post('/leave-types', { ...formType, maxDaysPerYear: Number(formType.maxDaysPerYear) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); toast('Leave type added'); setShowType(false); setFormType({ name: '', maxDaysPerYear: '', description: '' }); }, onError: (e: any) => toast(getErr(e), 'error') });
  const approve = useMutation({ mutationFn: ({ id, status }: any) => api.put(`/leave-requests/${id}/approve`, { status }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-requests'] }); toast('Updated'); }, onError: (e: any) => toast(getErr(e), 'error') });
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {['Requests', 'Leave Types'].map(t => (
          <button key={t} onClick={() => setSubTab(t)} className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${subTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>
      {subTab === 'Requests' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setShowReq(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Request</button></div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Employee','Type','From','To','Days','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reqs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.employee_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.leave_type_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.start_date?.split('T')[0]}</td>
                    <td className="px-4 py-3 text-gray-500">{r.end_date?.split('T')[0]}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{r.total_days}</td>
                    <td className="px-4 py-3">{badge(r.status)}</td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => approve.mutate({ id: r.id, status: 'approved' })} className="text-xs text-emerald-600 hover:underline font-medium">Approve</button>
                          <button onClick={() => approve.mutate({ id: r.id, status: 'rejected' })} className="text-xs text-red-500 hover:underline font-medium">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showReq && <Modal title="New Leave Request" onClose={() => setShowReq(false)}>
            <div className="space-y-3">
              <Select label="Employee" value={formReq.employeeId} onChange={(e: any) => setFormReq(p => ({ ...p, employeeId: e.target.value }))}><option value="">— Select —</option>{emps.map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}</Select>
              <Select label="Leave Type" value={formReq.leaveTypeId} onChange={(e: any) => setFormReq(p => ({ ...p, leaveTypeId: e.target.value }))}><option value="">— Select —</option>{types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Date" type="date" value={formReq.startDate} onChange={(e: any) => setFormReq(p => ({ ...p, startDate: e.target.value }))} />
                <Input label="End Date" type="date" value={formReq.endDate} onChange={(e: any) => setFormReq(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <Input label="Reason" value={formReq.reason} onChange={(e: any) => setFormReq(p => ({ ...p, reason: e.target.value }))} />
            </div>
            <button onClick={() => saveReq.mutate()} disabled={saveReq.isPending} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">{saveReq.isPending ? 'Submitting...' : 'Submit'}</button>
          </Modal>}
        </div>
      )}
      {subTab === 'Leave Types' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setShowType(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Type</button></div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {types.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                <div><p className="font-medium text-sm text-gray-800">{t.name}</p><p className="text-xs text-gray-400">{t.max_days_per_year} days/year — {t.description}</p></div>
              </div>
            ))}
          </div>
          {showType && <Modal title="Add Leave Type" onClose={() => setShowType(false)}>
            <div className="space-y-3">
              <Input label="Name" value={formType.name} onChange={(e: any) => setFormType(p => ({ ...p, name: e.target.value }))} />
              <Input label="Max Days/Year" type="number" value={formType.maxDaysPerYear} onChange={(e: any) => setFormType(p => ({ ...p, maxDaysPerYear: e.target.value }))} />
              <Input label="Description" value={formType.description} onChange={(e: any) => setFormType(p => ({ ...p, description: e.target.value }))} />
            </div>
            <button onClick={() => saveType.mutate()} disabled={saveType.isPending} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">{saveType.isPending ? 'Saving...' : 'Save'}</button>
          </Modal>}
        </div>
      )}
    </div>
  );
}

// ── Payroll ───────────────────────────────────────────────────────────────────
function PayrollTab({ toast, qc }: any) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data: payrolls = [] } = useQuery({ queryKey: ['payroll', month, year], queryFn: () => api.get(`/payroll?month=${month}&year=${year}`).then(r => r.data) });
  const { data: summary } = useQuery({ queryKey: ['payroll-summary', month, year], queryFn: () => api.get(`/payroll/summary?month=${month}&year=${year}`).then(r => r.data) });
  const generate = useMutation({ mutationFn: () => api.post('/payroll/generate', { month, year }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', month, year] }); qc.invalidateQueries({ queryKey: ['payroll-summary', month, year] }); toast('Payroll generated'); }, onError: (e: any) => toast(getErr(e), 'error') });
  const updateStatus = useMutation({ mutationFn: ({ id, status }: any) => api.put(`/payroll/${id}/status`, { status }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll', month, year] }); qc.invalidateQueries({ queryKey: ['payroll-summary', month, year] }); toast('Status updated'); }, onError: (e: any) => toast(getErr(e), 'error') });
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <Select label="Month" value={month} onChange={(e: any) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}</Select>
        <Select label="Year" value={year} onChange={(e: any) => setYear(Number(e.target.value))}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</Select>
        <button onClick={() => generate.mutate()} disabled={generate.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">{generate.isPending ? 'Generating...' : 'Generate Payroll'}</button>
      </div>
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[{ label: 'Total Employees', value: summary.total_employees }, { label: 'Total Basic', value: sar(summary.total_basic || 0) }, { label: 'Total Net', value: sar(summary.total_net || 0) }, { label: 'Status', value: `${summary.paid_count || 0} paid` }].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm border p-4"><p className="text-xs text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-800 mt-1">{s.value}</p></div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>{['Employee','Basic','Allowances','Deductions','Net Salary','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payrolls.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{p.employee_name}<div className="text-xs text-gray-400">{p.department_name}</div></td>
                <td className="px-4 py-3 text-gray-700">{sar(p.basic_salary)}</td>
                <td className="px-4 py-3 text-emerald-600">{sar(p.housing_allowance + p.transport_allowance + p.other_allowances)}</td>
                <td className="px-4 py-3 text-red-500">{sar(p.total_deductions)}</td>
                <td className="px-4 py-3 font-bold text-gray-900">{sar(p.net_salary)}</td>
                <td className="px-4 py-3">{badge(p.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {p.status === 'draft' && <button onClick={() => updateStatus.mutate({ id: p.id, status: 'approved' })} className="text-xs text-indigo-600 hover:underline font-medium">Approve</button>}
                    {p.status === 'approved' && <button onClick={() => updateStatus.mutate({ id: p.id, status: 'paid' })} className="text-xs text-emerald-600 hover:underline font-medium">Mark Paid</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
