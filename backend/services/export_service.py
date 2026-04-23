"""
Reports & Export Service
Generate Excel and PDF reports for various data exports
"""

import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import xlsxwriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


class ExcelExporter:
    """Generate Excel reports"""
    
    @staticmethod
    def create_workbook():
        """Create a new workbook in memory"""
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        return workbook, output
    
    @staticmethod
    def add_header_format(workbook):
        """Create header format"""
        return workbook.add_format({
            'bold': True,
            'bg_color': '#1e3a5f',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'font_size': 11
        })
    
    @staticmethod
    def add_cell_format(workbook):
        """Create cell format"""
        return workbook.add_format({
            'border': 1,
            'align': 'left',
            'valign': 'vcenter',
            'font_size': 10
        })
    
    @staticmethod
    def add_currency_format(workbook):
        """Create currency format"""
        return workbook.add_format({
            'border': 1,
            'align': 'right',
            'valign': 'vcenter',
            'font_size': 10,
            'num_format': '₹#,##0.00'
        })
    
    @staticmethod
    def add_date_format(workbook):
        """Create date format"""
        return workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter',
            'font_size': 10,
            'num_format': 'dd-mmm-yyyy'
        })

    @staticmethod
    def export_properties(properties: List[Dict], project_name: str = None) -> io.BytesIO:
        """Export properties to Excel"""
        workbook, output = ExcelExporter.create_workbook()
        worksheet = workbook.add_worksheet('Properties')
        
        # Formats
        header_fmt = ExcelExporter.add_header_format(workbook)
        cell_fmt = ExcelExporter.add_cell_format(workbook)
        currency_fmt = ExcelExporter.add_currency_format(workbook)
        
        # Title
        title_fmt = workbook.add_format({'bold': True, 'font_size': 14})
        worksheet.write(0, 0, f"Properties Report - {project_name or 'All Projects'}", title_fmt)
        worksheet.write(1, 0, f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}")
        
        # Headers
        headers = ['S.No', 'Property No', 'Block', 'Area (sq.yard)', 'Facing', 'Price', 'Status', 'Customer', 'Phone']
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_fmt)
            worksheet.set_column(col, col, 15)
        
        # Data
        for row, prop in enumerate(properties, start=4):
            worksheet.write(row, 0, row - 3, cell_fmt)
            worksheet.write(row, 1, prop.get('property_number', ''), cell_fmt)
            worksheet.write(row, 2, prop.get('block', ''), cell_fmt)
            worksheet.write(row, 3, prop.get('area', 0), cell_fmt)
            worksheet.write(row, 4, prop.get('facing', ''), cell_fmt)
            worksheet.write(row, 5, prop.get('price', 0), currency_fmt)
            worksheet.write(row, 6, prop.get('status_id', prop.get('status', '')), cell_fmt)
            worksheet.write(row, 7, prop.get('customer_name', ''), cell_fmt)
            worksheet.write(row, 8, prop.get('customer_phone', ''), cell_fmt)
        
        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    def export_leads(leads: List[Dict]) -> io.BytesIO:
        """Export leads to Excel"""
        workbook, output = ExcelExporter.create_workbook()
        worksheet = workbook.add_worksheet('Leads')
        
        header_fmt = ExcelExporter.add_header_format(workbook)
        cell_fmt = ExcelExporter.add_cell_format(workbook)
        
        # Title
        title_fmt = workbook.add_format({'bold': True, 'font_size': 14})
        worksheet.write(0, 0, "Leads Report", title_fmt)
        worksheet.write(1, 0, f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}")
        
        # Headers
        headers = ['S.No', 'Name', 'Phone', 'Email', 'Source', 'Status', 'Project', 'Assigned To', 'Created Date']
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_fmt)
            worksheet.set_column(col, col, 15)
        
        # Data
        for row, lead in enumerate(leads, start=4):
            worksheet.write(row, 0, row - 3, cell_fmt)
            worksheet.write(row, 1, lead.get('name', ''), cell_fmt)
            worksheet.write(row, 2, lead.get('phone', ''), cell_fmt)
            worksheet.write(row, 3, lead.get('email', ''), cell_fmt)
            worksheet.write(row, 4, lead.get('source', ''), cell_fmt)
            worksheet.write(row, 5, lead.get('status_name', lead.get('status', '')), cell_fmt)
            worksheet.write(row, 6, lead.get('project_name', ''), cell_fmt)
            worksheet.write(row, 7, lead.get('assigned_to_name', ''), cell_fmt)
            worksheet.write(row, 8, lead.get('created_at', '')[:10] if lead.get('created_at') else '', cell_fmt)
        
        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    def export_bookings(bookings: List[Dict]) -> io.BytesIO:
        """Export bookings to Excel"""
        workbook, output = ExcelExporter.create_workbook()
        worksheet = workbook.add_worksheet('Bookings')
        
        header_fmt = ExcelExporter.add_header_format(workbook)
        cell_fmt = ExcelExporter.add_cell_format(workbook)
        currency_fmt = ExcelExporter.add_currency_format(workbook)
        
        # Title
        title_fmt = workbook.add_format({'bold': True, 'font_size': 14})
        worksheet.write(0, 0, "Bookings Report", title_fmt)
        worksheet.write(1, 0, f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}")
        
        # Headers
        headers = ['S.No', 'Booking ID', 'Customer', 'Phone', 'Property', 'Project', 'Total Amount', 'Paid', 'Balance', 'Status', 'Date']
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_fmt)
            worksheet.set_column(col, col, 15)
        
        # Data
        for row, booking in enumerate(bookings, start=4):
            worksheet.write(row, 0, row - 3, cell_fmt)
            worksheet.write(row, 1, booking.get('id', '')[:8], cell_fmt)
            worksheet.write(row, 2, booking.get('customer_name', ''), cell_fmt)
            worksheet.write(row, 3, booking.get('customer_phone', ''), cell_fmt)
            worksheet.write(row, 4, booking.get('property_number', ''), cell_fmt)
            worksheet.write(row, 5, booking.get('project_name', ''), cell_fmt)
            worksheet.write(row, 6, booking.get('total_amount', 0), currency_fmt)
            worksheet.write(row, 7, booking.get('paid_amount', 0), currency_fmt)
            worksheet.write(row, 8, booking.get('total_amount', 0) - booking.get('paid_amount', 0), currency_fmt)
            worksheet.write(row, 9, booking.get('status', ''), cell_fmt)
            worksheet.write(row, 10, booking.get('booking_date', '')[:10] if booking.get('booking_date') else '', cell_fmt)
        
        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    def export_payments(payments: List[Dict]) -> io.BytesIO:
        """Export payments to Excel"""
        workbook, output = ExcelExporter.create_workbook()
        worksheet = workbook.add_worksheet('Payments')
        
        header_fmt = ExcelExporter.add_header_format(workbook)
        cell_fmt = ExcelExporter.add_cell_format(workbook)
        currency_fmt = ExcelExporter.add_currency_format(workbook)
        
        # Title
        title_fmt = workbook.add_format({'bold': True, 'font_size': 14})
        worksheet.write(0, 0, "Payments Report", title_fmt)
        worksheet.write(1, 0, f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}")
        
        # Headers
        headers = ['S.No', 'Receipt No', 'Customer', 'Property', 'Amount', 'Mode', 'Date', 'Status']
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_fmt)
            worksheet.set_column(col, col, 15)
        
        # Data
        for row, payment in enumerate(payments, start=4):
            worksheet.write(row, 0, row - 3, cell_fmt)
            worksheet.write(row, 1, f"RCP-{payment.get('id', '')[:8].upper()}", cell_fmt)
            worksheet.write(row, 2, payment.get('customer_name', ''), cell_fmt)
            worksheet.write(row, 3, payment.get('property_number', ''), cell_fmt)
            worksheet.write(row, 4, payment.get('amount', 0), currency_fmt)
            worksheet.write(row, 5, payment.get('payment_mode', ''), cell_fmt)
            worksheet.write(row, 6, payment.get('payment_date', '')[:10] if payment.get('payment_date') else '', cell_fmt)
            worksheet.write(row, 7, payment.get('status', ''), cell_fmt)
        
        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    def export_payment_schedule(schedules: List[Dict], customer_name: str = None) -> io.BytesIO:
        """Export payment schedule to Excel"""
        workbook, output = ExcelExporter.create_workbook()
        worksheet = workbook.add_worksheet('Payment Schedule')
        
        header_fmt = ExcelExporter.add_header_format(workbook)
        cell_fmt = ExcelExporter.add_cell_format(workbook)
        currency_fmt = ExcelExporter.add_currency_format(workbook)
        
        # Conditional formats for status
        paid_fmt = workbook.add_format({'border': 1, 'bg_color': '#d4edda', 'font_color': '#155724'})
        pending_fmt = workbook.add_format({'border': 1, 'bg_color': '#fff3cd', 'font_color': '#856404'})
        overdue_fmt = workbook.add_format({'border': 1, 'bg_color': '#f8d7da', 'font_color': '#721c24'})
        
        # Title
        title_fmt = workbook.add_format({'bold': True, 'font_size': 14})
        worksheet.write(0, 0, f"Payment Schedule - {customer_name or 'All Customers'}", title_fmt)
        worksheet.write(1, 0, f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}")
        
        # Headers
        headers = ['S.No', 'Installment', 'Property', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status']
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_fmt)
            worksheet.set_column(col, col, 15)
        
        # Data
        for row, schedule in enumerate(schedules, start=4):
            status = schedule.get('status', '').lower()
            status_fmt = paid_fmt if status == 'paid' else (overdue_fmt if status == 'overdue' else pending_fmt)
            
            worksheet.write(row, 0, row - 3, cell_fmt)
            worksheet.write(row, 1, schedule.get('installment_name', f"EMI {schedule.get('installment_number', '')}"), cell_fmt)
            worksheet.write(row, 2, schedule.get('property_number', ''), cell_fmt)
            worksheet.write(row, 3, schedule.get('due_date', '')[:10] if schedule.get('due_date') else '', cell_fmt)
            worksheet.write(row, 4, schedule.get('due_amount', schedule.get('amount', 0)), currency_fmt)
            worksheet.write(row, 5, schedule.get('paid_amount', 0), currency_fmt)
            worksheet.write(row, 6, schedule.get('remaining_amount', schedule.get('due_amount', 0)), currency_fmt)
            worksheet.write(row, 7, schedule.get('status', ''), status_fmt)
        
        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    def export_customers(customers: List[Dict]) -> io.BytesIO:
        """Export customers to Excel"""
        workbook, output = ExcelExporter.create_workbook()
        worksheet = workbook.add_worksheet('Customers')
        
        header_fmt = ExcelExporter.add_header_format(workbook)
        cell_fmt = ExcelExporter.add_cell_format(workbook)
        currency_fmt = ExcelExporter.add_currency_format(workbook)
        
        # Title
        title_fmt = workbook.add_format({'bold': True, 'font_size': 14})
        worksheet.write(0, 0, "Customers Report", title_fmt)
        worksheet.write(1, 0, f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}")
        
        # Headers
        headers = ['S.No', 'Name', 'Phone', 'Email', 'Address', 'Aadhar', 'PAN', 'Properties', 'Total Invested', 'Status']
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_fmt)
            worksheet.set_column(col, col, 15)
        
        # Data
        for row, customer in enumerate(customers, start=4):
            worksheet.write(row, 0, row - 3, cell_fmt)
            worksheet.write(row, 1, customer.get('name', ''), cell_fmt)
            worksheet.write(row, 2, customer.get('phone', ''), cell_fmt)
            worksheet.write(row, 3, customer.get('email', ''), cell_fmt)
            worksheet.write(row, 4, customer.get('address', ''), cell_fmt)
            worksheet.write(row, 5, customer.get('aadhar_number', ''), cell_fmt)
            worksheet.write(row, 6, customer.get('pan_number', ''), cell_fmt)
            worksheet.write(row, 7, customer.get('property_count', 0), cell_fmt)
            worksheet.write(row, 8, customer.get('total_invested', 0), currency_fmt)
            worksheet.write(row, 9, customer.get('status', 'active'), cell_fmt)
        
        workbook.close()
        output.seek(0)
        return output


class PDFExporter:
    """Generate PDF reports"""
    
    @staticmethod
    def create_document(title: str, landscape_mode: bool = False):
        """Create a PDF document"""
        output = io.BytesIO()
        page_size = landscape(A4) if landscape_mode else A4
        doc = SimpleDocTemplate(output, pagesize=page_size, topMargin=20*mm, bottomMargin=20*mm)
        return doc, output
    
    @staticmethod
    def get_styles():
        """Get paragraph styles"""
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='ReportTitle',
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=10
        ))
        styles.add(ParagraphStyle(
            name='ReportSubtitle',
            fontSize=10,
            leading=12,
            alignment=TA_CENTER,
            spaceAfter=20,
            textColor=colors.grey
        ))
        return styles

    @staticmethod
    def export_properties_pdf(properties: List[Dict], project_name: str = None, company_info: dict = None) -> io.BytesIO:
        """Export properties to PDF"""
        doc, output = PDFExporter.create_document("Properties Report", landscape_mode=True)
        styles = PDFExporter.get_styles()
        elements = []
        
        # Title
        elements.append(Paragraph(f"Properties Report - {project_name or 'All Projects'}", styles['ReportTitle']))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')}", styles['ReportSubtitle']))
        elements.append(Spacer(1, 10))
        
        # Table data
        data = [['S.No', 'Property', 'Block', 'Area', 'Facing', 'Price', 'Status', 'Customer']]
        for idx, prop in enumerate(properties, 1):
            data.append([
                str(idx),
                prop.get('property_number', ''),
                prop.get('block', ''),
                f"{prop.get('area', 0)} sq.yd",
                prop.get('facing', ''),
                f"₹{prop.get('price', 0):,.0f}",
                prop.get('status_id', prop.get('status', '')),
                prop.get('customer_name', '')[:20]
            ])
        
        # Table style
        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
        ]))
        elements.append(table)
        
        doc.build(elements)
        output.seek(0)
        return output

    @staticmethod
    def export_payment_schedule_pdf(schedules: List[Dict], customer_name: str = None, property_info: dict = None) -> io.BytesIO:
        """Export payment schedule to PDF"""
        doc, output = PDFExporter.create_document("Payment Schedule")
        styles = PDFExporter.get_styles()
        elements = []
        
        # Title
        elements.append(Paragraph("Payment Schedule", styles['ReportTitle']))
        if customer_name:
            elements.append(Paragraph(f"Customer: {customer_name}", styles['ReportSubtitle']))
        elements.append(Spacer(1, 10))
        
        # Summary
        total_amount = sum(s.get('due_amount', s.get('amount', 0)) for s in schedules)
        paid_amount = sum(s.get('paid_amount', 0) for s in schedules)
        pending_amount = total_amount - paid_amount
        
        summary_data = [
            ['Total Amount', 'Paid Amount', 'Pending Amount'],
            [f"₹{total_amount:,.0f}", f"₹{paid_amount:,.0f}", f"₹{pending_amount:,.0f}"]
        ]
        summary_table = Table(summary_data, colWidths=[150, 150, 150])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e9ecef')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Schedule table
        data = [['S.No', 'Installment', 'Due Date', 'Amount', 'Status']]
        for idx, schedule in enumerate(schedules, 1):
            status = schedule.get('status', 'pending')
            data.append([
                str(idx),
                schedule.get('installment_name', f"EMI {schedule.get('installment_number', '')}"),
                schedule.get('due_date', '')[:10] if schedule.get('due_date') else '',
                f"₹{schedule.get('due_amount', schedule.get('amount', 0)):,.0f}",
                status.capitalize()
            ])
        
        table = Table(data, colWidths=[40, 150, 100, 100, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
        ]))
        elements.append(table)
        
        doc.build(elements)
        output.seek(0)
        return output
