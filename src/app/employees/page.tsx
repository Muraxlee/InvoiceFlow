
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Task } from "@/types/database";
import { getEmployees, getTasksForEmployee } from "@/lib/firestore-actions";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EmployeeForm } from "@/components/employee-form";
import { TaskForm } from "@/components/task-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addEmployee, updateEmployee, deleteEmployee, addTask, updateTask, deleteTask } from "@/lib/firestore-actions";
import { format, isPast } from "date-fns";
import { ClipboardUser, UserPlus, PlusCircle, MoreHorizontal, Edit, Trash2, Calendar, Clock, Loader2, AlertCircle, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

function EmployeeTasks({ employeeId }: { employeeId: string }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: tasks, isLoading: isLoadingTasks } = useQuery<Task[]>({
        queryKey: ['tasks', employeeId],
        queryFn: () => getTasksForEmployee(employeeId),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ taskId, status }: { taskId: string, status: Task['status'] }) => updateTask(taskId, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', employeeId] });
            toast({ title: "Task Updated", description: "The task status has been updated." });
        },
        onError: (error: any) => toast({ title: "Error", description: `Failed to update task: ${error.message}`, variant: "destructive" }),
    });

    const getStatusColor = (status: Task['status'], dueDate: Date) => {
        if (status === 'Done') return 'bg-green-500/20 text-green-700 border-green-500/30';
        if (isPast(dueDate) && status !== 'Done') return 'bg-red-500/20 text-red-700 border-red-500/30';
        if (status === 'In Progress') return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    };

    if (isLoadingTasks) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

    if (!tasks || tasks.length === 0) {
        return <p className="text-sm text-muted-foreground px-4 pb-4">No tasks assigned to this employee yet.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map(task => (
                    <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Badge className={cn("cursor-pointer", getStatusColor(task.status, new Date(task.dueDate)))}>{task.status}</Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'Todo' })}>To Do</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'In Progress' })}>In Progress</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'Done' })}>Done</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        <TableCell>{format(new Date(task.dueDate), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function EmployeeManagementPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const { data: employees, isLoading, error } = useQuery<Employee[]>({
        queryKey: ['employees'],
        queryFn: getEmployees,
    });
    
    const { mutate: addEmployeeMutation, isPending: isAddingEmployee } = useMutation({
        mutationFn: addEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast({ title: "Employee Added", description: "The new employee has been successfully added." });
            setIsEmployeeFormOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: `Failed to add employee: ${err.message}`, variant: "destructive" }),
    });

    const { mutate: deleteEmployeeMutation } = useMutation({
        mutationFn: deleteEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast({ title: "Employee Deleted", description: "The employee and their tasks have been removed." });
        },
        onError: (err: any) => toast({ title: "Error", description: `Failed to delete employee: ${err.message}`, variant: "destructive" }),
    });

    const { mutate: addTaskMutation, isPending: isAddingTask } = useMutation({
        mutationFn: addTask,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', variables.employeeId] });
            toast({ title: "Task Assigned", description: "The new task has been assigned to the employee." });
            setIsTaskFormOpen(false);
            setSelectedEmployee(null);
        },
        onError: (err: any) => toast({ title: "Error", description: `Failed to assign task: ${err.message}`, variant: "destructive" }),
    });

    const openTaskForm = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsTaskFormOpen(true);
    };

    if (error) {
        return <div className="p-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load employee data.</AlertDescription></Alert></div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Employee Management"
                description="Manage your employees and their assigned tasks."
                actions={
                    <Dialog open={isEmployeeFormOpen} onOpenChange={setIsEmployeeFormOpen}>
                        <DialogTrigger asChild>
                            <Button><UserPlus className="mr-2 h-4 w-4" /> Add Employee</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Employee</DialogTitle><DialogDescription>Fill in the details to add a new employee to your team.</DialogDescription></DialogHeader>
                            <EmployeeForm onSubmit={(values) => addEmployeeMutation(values)} isLoading={isAddingEmployee} onCancel={() => setIsEmployeeFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                }
            />

            <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Assign New Task</DialogTitle><DialogDescription>Assign a new task to {selectedEmployee?.name}.</DialogDescription></DialogHeader>
                    {selectedEmployee && <TaskForm employee={selectedEmployee} onSubmit={(values) => addTaskMutation(values)} isLoading={isAddingTask} onCancel={() => setIsTaskFormOpen(false)} />}
                </DialogContent>
            </Dialog>
            
            <Card>
                <CardHeader><CardTitle>Employee List</CardTitle><CardDescription>Click on an employee to view their tasks.</CardDescription></CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                     employees && employees.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {employees.map(employee => (
                                <AccordionItem value={employee.id} key={employee.id}>
                                    <AccordionTrigger className="hover:bg-muted/50 px-4">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-muted rounded-full"><ClipboardUser className="h-5 w-5 text-muted-foreground" /></div>
                                                <div>
                                                    <h3 className="font-semibold text-base">{employee.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{employee.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mr-4">
                                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openTaskForm(employee); }}><PlusCircle className="mr-2 h-4 w-4"/> Assign Task</Button>
                                                <ConfirmDialog
                                                    triggerButton={<Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>}
                                                    title={`Delete ${employee.name}?`}
                                                    description="This will permanently delete the employee and all of their assigned tasks. This action cannot be undone."
                                                    onConfirm={() => deleteEmployeeMutation(employee.id)}
                                                    confirmText="Yes, Delete"
                                                    confirmVariant="destructive"
                                                />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <EmployeeTasks employeeId={employee.id} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                     ) : (
                        <p className="text-center text-muted-foreground py-8">No employees found. Add one to get started.</p>
                     )
                    }
                </CardContent>
            </Card>
        </div>
    );
}

    