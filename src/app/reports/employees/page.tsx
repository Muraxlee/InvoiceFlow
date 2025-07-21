
"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEmployees, getTasks } from '@/lib/firestore-actions';
import type { Employee, Task } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { Loader2, Search, X, RefreshCw, ArrowLeft, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type EmployeeReportData = Employee & {
    taskCounts: {
        todo: number;
        inProgress: number;
        done: number;
        total: number;
    };
};

export default function EmployeeReportPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: employees, isLoading: isLoadingEmployees, refetch: refetchEmployees } = useQuery<Employee[]>({
        queryKey: ['employees'],
        queryFn: getEmployees,
    });

    const { data: tasks, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: getTasks,
    });

    const reportData = useMemo<EmployeeReportData[]>(() => {
        if (!employees || !tasks) return [];
        return employees.map(employee => {
            const employeeTasks = tasks.filter(t => t.employeeId === employee.id);
            const report: EmployeeReportData = {
                ...employee,
                taskCounts: { todo: 0, inProgress: 0, done: 0, total: employeeTasks.length }
            };
            employeeTasks.forEach(task => {
                if (task.status === 'Todo') report.taskCounts.todo++;
                else if (task.status === 'In Progress') report.taskCounts.inProgress++;
                else if (task.status === 'Done') report.taskCounts.done++;
            });
            return report;
        });
    }, [employees, tasks]);

    const filteredData = useMemo(() => {
        return reportData.filter(employee => {
            const lowercasedTerm = searchTerm.toLowerCase();
            return !lowercasedTerm || 
                   employee.name.toLowerCase().includes(lowercasedTerm) ||
                   employee.role.toLowerCase().includes(lowercasedTerm);
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [reportData, searchTerm]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Employee Task Report", 14, 16);
        autoTable(doc, {
            head: [['Employee', 'Role', 'To Do', 'In Progress', 'Done', 'Total Tasks']],
            body: filteredData.map(e => [
                e.name,
                e.role,
                e.taskCounts.todo,
                e.taskCounts.inProgress,
                e.taskCounts.done,
                e.taskCounts.total
            ]),
            startY: 20
        });
        doc.save('employee_report.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredData.map(e => ({
            'Employee': e.name,
            'Role': e.role,
            'To Do': e.taskCounts.todo,
            'In Progress': e.taskCounts.inProgress,
            'Done': e.taskCounts.done,
            'Total Tasks': e.taskCounts.total
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, "employee_report.xlsx");
    };

    const handleRefresh = () => {
        refetchEmployees();
        refetchTasks();
    }

    return (
        <div className="space-y-6">
            <PageHeader
              title="Employee Report"
              description="Analyze employee task assignments and workload."
              actions={
                <div className="flex items-center gap-2">
                  <Link href="/reports">
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  </Link>
                  <Button onClick={handleRefresh} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
                </div>
              }
            />
            <Card>
                <CardHeader>
                    <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <div className="relative flex-grow">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input placeholder="Employee Name or Role" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                    </div>
                    <Button onClick={() => setSearchTerm('')} variant="ghost" size="sm"><X className="mr-2 h-4 w-4" />Clear</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Employee Task Summary ({filteredData.length})</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportPDF}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" />Excel</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {(isLoadingEmployees || isLoadingTasks) ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Task Status</TableHead>
                                    <TableHead className="text-center">Total Tasks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? filteredData.map(employee => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium">{employee.name}</TableCell>
                                        <TableCell>{employee.role}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="outline">{employee.taskCounts.todo} To Do</Badge>
                                                <Badge variant="warning">{employee.taskCounts.inProgress} In Progress</Badge>
                                                <Badge variant="success">{employee.taskCounts.done} Done</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{employee.taskCounts.total}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No employees match your criteria.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
