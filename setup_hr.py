import os

base = "apps/api/src/hr"
os.makedirs(base, exist_ok=True)

files = {}

files["department.entity.ts"] = """import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ nullable: true }) description: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
"""

files["department.dto.ts"] = """import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
}
export class UpdateDepartmentDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
}
"""

files["departments.service.ts"] = """import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';
@Injectable()
export class DepartmentsService {
  constructor(@InjectRepository(Department) private repo: Repository<Department>) {}
  findAll() { return this.repo.find({ order: { name: 'ASC' } }); }
  async findOne(id: string) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Department ${id} not found`);
    return d;
  }
  create(dto: CreateDepartmentDto) { return this.repo.save(this.repo.create(dto)); }
  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id); await this.repo.update(id, dto); return this.findOne(id);
  }
  async remove(id: string) { await this.findOne(id); await this.repo.delete(id); return { message: 'Deleted' }; }
}
"""

files["departments.controller.ts"] = """import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateDepartmentDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
"""

files["departments.module.ts"] = """import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './department.entity';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Department])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
"""

files["designation.entity.ts"] = """import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Department } from './department.entity';
@Entity('designations')
export class Designation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' }) department: Department;
  @Column({ nullable: true }) departmentId: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
"""

files["designation.dto.ts"] = """import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateDesignationDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() departmentId?: string;
}
export class UpdateDesignationDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() departmentId?: string;
}
"""

files["designations.service.ts"] = """import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation } from './designation.entity';
import { CreateDesignationDto, UpdateDesignationDto } from './designation.dto';
@Injectable()
export class DesignationsService {
  constructor(@InjectRepository(Designation) private repo: Repository<Designation>) {}
  findAll() { return this.repo.find({ relations: ['department'], order: { name: 'ASC' } }); }
  async findOne(id: string) {
    const d = await this.repo.findOne({ where: { id }, relations: ['department'] });
    if (!d) throw new NotFoundException(`Designation ${id} not found`);
    return d;
  }
  create(dto: CreateDesignationDto) { return this.repo.save(this.repo.create(dto)); }
  async update(id: string, dto: UpdateDesignationDto) {
    await this.findOne(id); await this.repo.update(id, dto); return this.findOne(id);
  }
  async remove(id: string) { await this.findOne(id); await this.repo.delete(id); return { message: 'Deleted' }; }
}
"""

files["designations.controller.ts"] = """import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './designation.dto';
@Controller('designations')
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateDesignationDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateDesignationDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
"""

files["designations.module.ts"] = """import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Designation } from './designation.entity';
import { DesignationsService } from './designations.service';
import { DesignationsController } from './designations.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Designation])],
  controllers: [DesignationsController],
  providers: [DesignationsService],
  exports: [DesignationsService],
})
export class DesignationsModule {}
"""

files["employee.entity.ts"] = """import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Department } from './department.entity';
import { Designation } from './designation.entity';
export enum EmployeeStatus { ACTIVE = 'active', INACTIVE = 'inactive', TERMINATED = 'terminated' }
export enum Gender { MALE = 'male', FEMALE = 'female', OTHER = 'other' }
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) employeeId: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ unique: true }) email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) address: string;
  @Column({ type: 'enum', enum: Gender, nullable: true }) gender: Gender;
  @Column({ type: 'date', nullable: true }) dateOfBirth: string;
  @Column({ type: 'date' }) joiningDate: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) basicSalary: number;
  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' }) department: Department;
  @Column({ nullable: true }) departmentId: string;
  @ManyToOne(() => Designation, { nullable: true, onDelete: 'SET NULL' }) designation: Designation;
  @Column({ nullable: true }) designationId: string;
  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE }) status: EmployeeStatus;
  @Column({ nullable: true }) nationalId: string;
  @Column({ nullable: true }) bankAccount: string;
  @Column({ nullable: true }) bankName: string;
  @Column({ nullable: true }) avatarUrl: string;
  @Column({ type: 'jsonb', nullable: true }) documents: Record<string, string>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
"""

files["employee.dto.ts"] = """import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EmployeeStatus, Gender } from './employee.entity';
export class CreateEmployeeDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsEmail() email: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() address?: string;
  @IsEnum(Gender) @IsOptional() gender?: Gender;
  @IsDateString() @IsOptional() dateOfBirth?: string;
  @IsDateString() joiningDate: string;
  @IsNumber() @Min(0) basicSalary: number;
  @IsString() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() designationId?: string;
  @IsEnum(EmployeeStatus) @IsOptional() status?: EmployeeStatus;
  @IsString() @IsOptional() nationalId?: string;
  @IsString() @IsOptional() bankAccount?: string;
  @IsString() @IsOptional() bankName?: string;
  @IsString() @IsOptional() avatarUrl?: string;
}
export class UpdateEmployeeDto {
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() address?: string;
  @IsEnum(Gender) @IsOptional() gender?: Gender;
  @IsDateString() @IsOptional() dateOfBirth?: string;
  @IsDateString() @IsOptional() joiningDate?: string;
  @IsNumber() @Min(0) @IsOptional() basicSalary?: number;
  @IsString() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() designationId?: string;
  @IsEnum(EmployeeStatus) @IsOptional() status?: EmployeeStatus;
  @IsString() @IsOptional() nationalId?: string;
  @IsString() @IsOptional() bankAccount?: string;
  @IsString() @IsOptional() bankName?: string;
  @IsString() @IsOptional() avatarUrl?: string;
}
"""

files["employees.service.ts"] = """import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
@Injectable()
export class EmployeesService {
  constructor(@InjectRepository(Employee) private repo: Repository<Employee>) {}
  private async generateEmployeeId(): Promise<string> {
    const count = await this.repo.count();
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }
  async findAll(search?: string) {
    const where = search
      ? [{ firstName: ILike(`%${search}%`) }, { lastName: ILike(`%${search}%`) }, { email: ILike(`%${search}%`) }, { employeeId: ILike(`%${search}%`) }]
      : undefined;
    return this.repo.find({ where, relations: ['department', 'designation'], order: { createdAt: 'DESC' } });
  }
  async findOne(id: string) {
    const emp = await this.repo.findOne({ where: { id }, relations: ['department', 'designation'] });
    if (!emp) throw new NotFoundException(`Employee ${id} not found`);
    return emp;
  }
  async create(dto: CreateEmployeeDto) {
    const employeeId = await this.generateEmployeeId();
    return this.repo.save(this.repo.create({ ...dto, employeeId }));
  }
  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id); await this.repo.update(id, dto as any); return this.findOne(id);
  }
  async remove(id: string) {
    await this.findOne(id); await this.repo.delete(id); return { message: 'Employee deleted' };
  }
}
"""

files["employees.controller.ts"] = """import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}
  @Get() findAll(@Query('search') search?: string) { return this.service.findAll(search); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateEmployeeDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
"""

files["employees.module.ts"] = """import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
"""

files["attendance.entity.ts"] = """import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './employee.entity';
export enum AttendanceStatus {
  PRESENT = 'present', ABSENT = 'absent', LATE = 'late',
  HALF_DAY = 'half_day', ON_LEAVE = 'on_leave', HOLIDAY = 'holiday',
}
@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' }) employee: Employee;
  @Column() employeeId: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'time', nullable: true }) checkIn: string;
  @Column({ type: 'time', nullable: true }) checkOut: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) workHours: number;
  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT }) status: AttendanceStatus;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
"""

files["attendance.dto.ts"] = """import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from './attendance.entity';
export class CreateAttendanceDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsDateString() date: string;
  @IsString() @IsOptional() checkIn?: string;
  @IsString() @IsOptional() checkOut?: string;
  @IsNumber() @IsOptional() workHours?: number;
  @IsEnum(AttendanceStatus) @IsOptional() status?: AttendanceStatus;
  @IsString() @IsOptional() notes?: string;
}
export class UpdateAttendanceDto {
  @IsString() @IsOptional() checkIn?: string;
  @IsString() @IsOptional() checkOut?: string;
  @IsNumber() @IsOptional() workHours?: number;
  @IsEnum(AttendanceStatus) @IsOptional() status?: AttendanceStatus;
  @IsString() @IsOptional() notes?: string;
}
export class BulkAttendanceDto {
  date: string;
  records: { employeeId: string; status: AttendanceStatus; checkIn?: string; checkOut?: string }[];
}
"""

files["attendance.service.ts"] = """import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { BulkAttendanceDto, CreateAttendanceDto, UpdateAttendanceDto } from './attendance.dto';
function calcHours(ci: string, co: string) {
  const [ih, im] = ci.split(':').map(Number);
  const [oh, om] = co.split(':').map(Number);
  return Math.round(((oh * 60 + om) - (ih * 60 + im)) / 60 * 100) / 100;
}
@Injectable()
export class AttendanceService {
  constructor(@InjectRepository(Attendance) private repo: Repository<Attendance>) {}
  findAll(employeeId?: string, from?: string, to?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (from && to) where.date = Between(from, to);
    return this.repo.find({ where, relations: ['employee'], order: { date: 'DESC' } });
  }
  findByDate(date: string) { return this.repo.find({ where: { date }, relations: ['employee'] }); }
  async findOne(id: string) {
    const a = await this.repo.findOne({ where: { id }, relations: ['employee'] });
    if (!a) throw new NotFoundException(`Attendance ${id} not found`);
    return a;
  }
  async create(dto: CreateAttendanceDto) {
    let workHours = dto.workHours;
    if (dto.checkIn && dto.checkOut && !workHours) workHours = calcHours(dto.checkIn, dto.checkOut);
    return this.repo.save(this.repo.create({ ...dto, workHours }));
  }
  async bulkCreate(dto: BulkAttendanceDto) {
    return this.repo.save(dto.records.map(r => this.repo.create({ date: dto.date, ...r })));
  }
  async update(id: string, dto: UpdateAttendanceDto) {
    const ex = await this.findOne(id);
    const ci = dto.checkIn ?? ex.checkIn; const co = dto.checkOut ?? ex.checkOut;
    let workHours = dto.workHours;
    if (ci && co && !workHours) workHours = calcHours(ci, co);
    await this.repo.update(id, { ...dto, workHours } as any);
    return this.findOne(id);
  }
  async remove(id: string) { await this.findOne(id); await this.repo.delete(id); return { message: 'Deleted' }; }
  async getMonthSummary(employeeId: string, year: number, month: number) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const records = await this.repo.find({ where: { employeeId, date: Between(from, to) } });
    const s = { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, totalHours: 0 };
    records.forEach(r => {
      if (r.status === 'present') s.present++;
      else if (r.status === 'absent') s.absent++;
      else if (r.status === 'late') s.late++;
      else if (r.status === 'half_day') s.halfDay++;
      else if (r.status === 'on_leave') s.onLeave++;
      s.totalHours += Number(r.workHours || 0);
    });
    return { employeeId, year, month, ...s, records };
  }
}
"""

files["attendance.controller.ts"] = """import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto, CreateAttendanceDto, UpdateAttendanceDto } from './attendance.dto';
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}
  @Get() findAll(@Query('employeeId') e?: string, @Query('from') f?: string, @Query('to') t?: string) { return this.service.findAll(e, f, t); }
  @Get('date/:date') findByDate(@Param('date') d: string) { return this.service.findByDate(d); }
  @Get('summary/:employeeId') summary(@Param('employeeId') e: string, @Query('year') y: string, @Query('month') m: string) { return this.service.getMonthSummary(e, Number(y), Number(m)); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateAttendanceDto) { return this.service.create(dto); }
  @Post('bulk') bulk(@Body() dto: BulkAttendanceDto) { return this.service.bulkCreate(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
"""

files["attendance.module.ts"] = """import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Attendance])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
"""

files["leave.entity.ts"] = """import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './employee.entity';
@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ default: 0 }) daysAllowed: number;
  @Column({ default: true }) isPaid: boolean;
  @Column({ nullable: true }) description: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
export enum LeaveStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected', CANCELLED = 'cancelled' }
@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' }) employee: Employee;
  @Column() employeeId: string;
  @ManyToOne(() => LeaveType, { nullable: true, onDelete: 'SET NULL' }) leaveType: LeaveType;
  @Column({ nullable: true }) leaveTypeId: string;
  @Column({ type: 'date' }) startDate: string;
  @Column({ type: 'date' }) endDate: string;
  @Column({ default: 1 }) totalDays: number;
  @Column({ nullable: true }) reason: string;
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING }) status: LeaveStatus;
  @Column({ nullable: true }) approvedBy: string;
  @Column({ type: 'timestamp', nullable: true }) approvedAt: Date;
  @Column({ nullable: true }) rejectionReason: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
"""

files["leave.dto.ts"] = """import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LeaveStatus } from './leave.entity';
export class CreateLeaveTypeDto {
  @IsString() @IsNotEmpty() name: string;
  @IsNumber() @Min(0) daysAllowed: number;
  @IsBoolean() @IsOptional() isPaid?: boolean;
  @IsString() @IsOptional() description?: string;
}
export class UpdateLeaveTypeDto {
  @IsString() @IsOptional() name?: string;
  @IsNumber() @Min(0) @IsOptional() daysAllowed?: number;
  @IsBoolean() @IsOptional() isPaid?: boolean;
  @IsString() @IsOptional() description?: string;
}
export class CreateLeaveRequestDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsOptional() leaveTypeId?: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsString() @IsOptional() reason?: string;
}
export class UpdateLeaveRequestDto {
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() reason?: string;
  @IsString() @IsOptional() leaveTypeId?: string;
}
export class ApproveLeaveDto {
  @IsEnum(LeaveStatus) status: LeaveStatus;
  @IsString() @IsOptional() approvedBy?: string;
  @IsString() @IsOptional() rejectionReason?: string;
}
"""

files["leave.service.ts"] = """import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest, LeaveStatus, LeaveType } from './leave.entity';
import { ApproveLeaveDto, CreateLeaveRequestDto, CreateLeaveTypeDto, UpdateLeaveRequestDto, UpdateLeaveTypeDto } from './leave.dto';
@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveType) private typeRepo: Repository<LeaveType>,
    @InjectRepository(LeaveRequest) private reqRepo: Repository<LeaveRequest>,
  ) {}
  findAllTypes() { return this.typeRepo.find({ order: { name: 'ASC' } }); }
  async findOneType(id: string) {
    const t = await this.typeRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Leave type ${id} not found`);
    return t;
  }
  createType(dto: CreateLeaveTypeDto) { return this.typeRepo.save(this.typeRepo.create(dto)); }
  async updateType(id: string, dto: UpdateLeaveTypeDto) { await this.findOneType(id); await this.typeRepo.update(id, dto); return this.findOneType(id); }
  async removeType(id: string) { await this.findOneType(id); await this.typeRepo.delete(id); return { message: 'Deleted' }; }
  findAllRequests(employeeId?: string, status?: LeaveStatus) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    return this.reqRepo.find({ where, relations: ['employee', 'leaveType'], order: { createdAt: 'DESC' } });
  }
  async findOneRequest(id: string) {
    const r = await this.reqRepo.findOne({ where: { id }, relations: ['employee', 'leaveType'] });
    if (!r) throw new NotFoundException(`Leave request ${id} not found`);
    return r;
  }
  async createRequest(dto: CreateLeaveRequestDto) {
    const totalDays = Math.ceil((new Date(dto.endDate).getTime() - new Date(dto.startDate).getTime()) / 86400000) + 1;
    return this.reqRepo.save(this.reqRepo.create({ ...dto, totalDays }));
  }
  async updateRequest(id: string, dto: UpdateLeaveRequestDto) {
    await this.findOneRequest(id);
    const update: any = { ...dto };
    if (dto.startDate && dto.endDate)
      update.totalDays = Math.ceil((new Date(dto.endDate).getTime() - new Date(dto.startDate).getTime()) / 86400000) + 1;
    await this.reqRepo.update(id, update);
    return this.findOneRequest(id);
  }
  async approveRequest(id: string, dto: ApproveLeaveDto) {
    await this.findOneRequest(id);
    await this.reqRepo.update(id, { status: dto.status, approvedBy: dto.approvedBy, approvedAt: dto.status === LeaveStatus.APPROVED ? new Date() : undefined, rejectionReason: dto.rejectionReason });
    return this.findOneRequest(id);
  }
  async removeRequest(id: string) { await this.findOneRequest(id); await this.reqRepo.delete(id); return { message: 'Deleted' }; }
  async getLeaveBalance(employeeId: string, year: number) {
    const types = await this.findAllTypes();
    const approved = await this.reqRepo.find({ where: { employeeId, status: LeaveStatus.APPROVED } });
    const ya = approved.filter(r => new Date(r.startDate).getFullYear() === year);
    return types.map(t => { const used = ya.filter(r => r.leaveTypeId === t.id).reduce((s, r) => s + r.totalDays, 0); return { leaveType: t, used, remaining: Math.max(0, t.daysAllowed - used) }; });
  }
}
"""

files["leave.controller.ts"] = """import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { ApproveLeaveDto, CreateLeaveRequestDto, CreateLeaveTypeDto, UpdateLeaveRequestDto, UpdateLeaveTypeDto } from './leave.dto';
import { LeaveStatus } from './leave.entity';
@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly service: LeaveService) {}
  @Get() findAll() { return this.service.findAllTypes(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOneType(id); }
  @Post() create(@Body() dto: CreateLeaveTypeDto) { return this.service.createType(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) { return this.service.updateType(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.removeType(id); }
}
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveService) {}
  @Get() findAll(@Query('employeeId') e?: string, @Query('status') s?: LeaveStatus) { return this.service.findAllRequests(e, s); }
  @Get('balance/:employeeId') balance(@Param('employeeId') e: string, @Query('year') y?: string) { return this.service.getLeaveBalance(e, Number(y || new Date().getFullYear())); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOneRequest(id); }
  @Post() create(@Body() dto: CreateLeaveRequestDto) { return this.service.createRequest(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateLeaveRequestDto) { return this.service.updateRequest(id, dto); }
  @Put(':id/approve') approve(@Param('id') id: string, @Body() dto: ApproveLeaveDto) { return this.service.approveRequest(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.removeRequest(id); }
}
"""

files["leave.module.ts"] = """import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveType, LeaveRequest } from './leave.entity';
import { LeaveService } from './leave.service';
import { LeaveTypesController, LeaveRequestsController } from './leave.controller';
@Module({
  imports: [TypeOrmModule.forFeature([LeaveType, LeaveRequest])],
  controllers: [LeaveTypesController, LeaveRequestsController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
"""

files["payroll.entity.ts"] = """import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './employee.entity';
export enum PayrollStatus { DRAFT = 'draft', APPROVED = 'approved', PAID = 'paid' }
@Entity('payroll')
export class Payroll {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Employee, { onDelete: 'CASCADE' }) employee: Employee;
  @Column() employeeId: string;
  @Column() month: number;
  @Column() year: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) basicSalary: number;
  @Column({ type: 'jsonb', default: '[]' }) allowances: { label: string; amount: number }[];
  @Column({ type: 'jsonb', default: '[]' }) deductions: { label: string; amount: number }[];
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) totalAllowances: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) totalDeductions: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) grossSalary: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) netSalary: number;
  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT }) status: PayrollStatus;
  @Column({ type: 'date', nullable: true }) paymentDate: string;
  @Column({ nullable: true }) paymentMethod: string;
  @Column({ nullable: true }) notes: string;
  @Column({ default: 0 }) presentDays: number;
  @Column({ default: 0 }) absentDays: number;
  @Column({ default: 0 }) leaveDays: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
"""

files["payroll.dto.ts"] = """import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PayrollStatus } from './payroll.entity';
export class CreatePayrollDto {
  @IsString() employeeId: string;
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() year: number;
  @IsNumber() @Min(0) basicSalary: number;
  @IsArray() @IsOptional() allowances?: { label: string; amount: number }[];
  @IsArray() @IsOptional() deductions?: { label: string; amount: number }[];
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() presentDays?: number;
  @IsNumber() @IsOptional() absentDays?: number;
  @IsNumber() @IsOptional() leaveDays?: number;
}
export class UpdatePayrollDto {
  @IsNumber() @Min(0) @IsOptional() basicSalary?: number;
  @IsArray() @IsOptional() allowances?: { label: string; amount: number }[];
  @IsArray() @IsOptional() deductions?: { label: string; amount: number }[];
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() presentDays?: number;
  @IsNumber() @IsOptional() absentDays?: number;
  @IsNumber() @IsOptional() leaveDays?: number;
}
export class UpdatePayrollStatusDto {
  @IsEnum(PayrollStatus) status: PayrollStatus;
  @IsDateString() @IsOptional() paymentDate?: string;
  @IsString() @IsOptional() paymentMethod?: string;
}
export class GeneratePayrollDto {
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() year: number;
  @IsOptional() employeeIds?: string[];
}
"""

files["payroll.service.ts"] = """import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll, PayrollStatus } from './payroll.entity';
import { CreatePayrollDto, GeneratePayrollDto, UpdatePayrollDto, UpdatePayrollStatusDto } from './payroll.dto';
import { Employee, EmployeeStatus } from './employee.entity';
import { Attendance, AttendanceStatus } from './attendance.entity';
function calcTotals(basic: number, allowances: any[], deductions: any[]) {
  const totalAllowances = allowances.reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
  const grossSalary = Number(basic) + totalAllowances;
  return { totalAllowances, totalDeductions, grossSalary, netSalary: grossSalary - totalDeductions };
}
@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll) private repo: Repository<Payroll>,
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(Attendance) private attRepo: Repository<Attendance>,
  ) {}
  findAll(month?: number, year?: number, employeeId?: string) {
    const where: any = {};
    if (month) where.month = month; if (year) where.year = year; if (employeeId) where.employeeId = employeeId;
    return this.repo.find({ where, relations: ['employee'], order: { year: 'DESC', month: 'DESC' } });
  }
  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id }, relations: ['employee'] });
    if (!p) throw new NotFoundException(`Payroll ${id} not found`);
    return p;
  }
  async create(dto: CreatePayrollDto) {
    const allowances = dto.allowances ?? []; const deductions = dto.deductions ?? [];
    return this.repo.save(this.repo.create({ ...dto, allowances, deductions, ...calcTotals(dto.basicSalary, allowances, deductions) }));
  }
  async update(id: string, dto: UpdatePayrollDto) {
    const ex = await this.findOne(id);
    const allowances = dto.allowances ?? ex.allowances; const deductions = dto.deductions ?? ex.deductions;
    const basic = dto.basicSalary ?? ex.basicSalary;
    await this.repo.update(id, { ...dto, allowances, deductions, ...calcTotals(basic, allowances, deductions) } as any);
    return this.findOne(id);
  }
  async updateStatus(id: string, dto: UpdatePayrollStatusDto) { await this.findOne(id); await this.repo.update(id, dto); return this.findOne(id); }
  async remove(id: string) { await this.findOne(id); await this.repo.delete(id); return { message: 'Deleted' }; }
  async generate(dto: GeneratePayrollDto) {
    const { month, year } = dto;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const employees = dto.employeeIds?.length ? await this.empRepo.findByIds(dto.employeeIds) : await this.empRepo.find({ where: { status: EmployeeStatus.ACTIVE } });
    const created: Payroll[] = [];
    for (const emp of employees) {
      if (await this.repo.findOne({ where: { employeeId: emp.id, month, year } })) continue;
      const att = (await this.attRepo.find({ where: { employeeId: emp.id } })).filter(a => a.date >= from && a.date <= to);
      const presentDays = att.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
      const absentDays = att.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const leaveDays = att.filter(a => a.status === AttendanceStatus.ON_LEAVE).length;
      const deductions = absentDays > 0 ? [{ label: 'Absence Deduction', amount: Math.round((Number(emp.basicSalary) / 30) * absentDays * 100) / 100 }] : [];
      created.push(await this.repo.save(this.repo.create({ employeeId: emp.id, month, year, basicSalary: emp.basicSalary, allowances: [], deductions, presentDays, absentDays, leaveDays, ...calcTotals(emp.basicSalary, [], deductions) })));
    }
    return { generated: created.length, payrolls: created };
  }
  async getMonthlySummary(month: number, year: number) {
    const p = await this.findAll(month, year);
    return { month, year, count: p.length, totalGross: p.reduce((s, x) => s + Number(x.grossSalary), 0), totalDeductions: p.reduce((s, x) => s + Number(x.totalDeductions), 0), totalNet: p.reduce((s, x) => s + Number(x.netSalary), 0), paid: p.filter(x => x.status === PayrollStatus.PAID).length, pending: p.filter(x => x.status !== PayrollStatus.PAID).length };
  }
}
"""

files["payroll.controller.ts"] = """import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, GeneratePayrollDto, UpdatePayrollDto, UpdatePayrollStatusDto } from './payroll.dto';
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}
  @Get() findAll(@Query('month') m?: string, @Query('year') y?: string, @Query('employeeId') e?: string) { return this.service.findAll(m ? Number(m) : undefined, y ? Number(y) : undefined, e); }
  @Get('summary') summary(@Query('month') m: string, @Query('year') y: string) { return this.service.getMonthlySummary(Number(m), Number(y)); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreatePayrollDto) { return this.service.create(dto); }
  @Post('generate') generate(@Body() dto: GeneratePayrollDto) { return this.service.generate(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdatePayrollDto) { return this.service.update(id, dto); }
  @Put(':id/status') status(@Param('id') id: string, @Body() dto: UpdatePayrollStatusDto) { return this.service.updateStatus(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
"""

files["payroll.module.ts"] = """import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payroll } from './payroll.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Employee } from './employee.entity';
import { Attendance } from './attendance.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Payroll, Employee, Attendance])],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
"""

files["hr.module.ts"] = """import { Module } from '@nestjs/common';
import { DepartmentsModule } from './departments.module';
import { DesignationsModule } from './designations.module';
import { EmployeesModule } from './employees.module';
import { AttendanceModule } from './attendance.module';
import { LeaveModule } from './leave.module';
import { PayrollModule } from './payroll.module';
@Module({
  imports: [DepartmentsModule, DesignationsModule, EmployeesModule, AttendanceModule, LeaveModule, PayrollModule],
  exports: [DepartmentsModule, DesignationsModule, EmployeesModule, AttendanceModule, LeaveModule, PayrollModule],
})
export class HrModule {}
"""

for filename, content in files.items():
    path = os.path.join(base, filename)
    with open(path, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f"✅ {filename}")

print(f"\n🎉 Done! {len(files)} files created in {base}/")
