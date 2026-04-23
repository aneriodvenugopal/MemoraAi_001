"""
Receipt Generation Service
- Generate PDF receipts for payments
- Support multiple receipt types (EMI, booking, general)
- Store receipts in database and return URLs
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime, timezone
import uuid
import base64
import os


class ReceiptGenerator:
    """Generate PDF receipts for various payment types"""
    
    def __init__(self, company_info: dict = None):
        self.company_info = company_info or {
            "name": "ExlainERP Real Estate",
            "address": "123 Business Park, Main Road",
            "city": "Hyderabad, Telangana - 500001",
            "phone": "+91 9876543210",
            "email": "info@memoraai.in",
            "gstin": "36AABCU9603R1ZM"
        }
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='ReceiptTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            alignment=TA_CENTER,
            spaceAfter=10
        ))
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading2'],
            fontSize=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a365d')
        ))
        self.styles.add(ParagraphStyle(
            name='CompanyInfo',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.grey
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=11,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=5,
            spaceBefore=10
        ))
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.white,
            alignment=TA_CENTER
        ))
        self.styles.add(ParagraphStyle(
            name='AmountLarge',
            parent=self.styles['Normal'],
            fontSize=14,
            alignment=TA_RIGHT,
            textColor=colors.HexColor('#2d7a4a')
        ))
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.grey
        ))
    
    def _format_currency(self, amount: float) -> str:
        """Format amount as Indian currency"""
        return f"₹{amount:,.2f}"
    
    def _format_date(self, date_str: str) -> str:
        """Format date string"""
        if isinstance(date_str, datetime):
            return date_str.strftime("%d %b %Y")
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime("%d %b %Y")
        except:
            return str(date_str)[:10]
    
    def generate_payment_receipt(
        self,
        receipt_number: str,
        payment_data: dict,
        customer_data: dict,
        property_data: dict = None,
        booking_data: dict = None,
        company_info: dict = None
    ) -> bytes:
        """Generate payment receipt PDF"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )
        
        company = company_info or self.company_info
        elements = []
        
        # Header - Company Info
        elements.append(Paragraph(company["name"], self.styles['CompanyName']))
        elements.append(Paragraph(company["address"], self.styles['CompanyInfo']))
        elements.append(Paragraph(f"{company['city']} | Ph: {company['phone']}", self.styles['CompanyInfo']))
        if company.get("gstin"):
            elements.append(Paragraph(f"GSTIN: {company['gstin']}", self.styles['CompanyInfo']))
        elements.append(Spacer(1, 10))
        
        # Receipt Title
        elements.append(Paragraph("PAYMENT RECEIPT", self.styles['ReceiptTitle']))
        elements.append(Spacer(1, 5))
        
        # Receipt Info Table
        receipt_date = self._format_date(payment_data.get("payment_date", datetime.now().isoformat()))
        receipt_info = [
            ["Receipt No:", receipt_number, "Date:", receipt_date],
        ]
        receipt_table = Table(receipt_info, colWidths=[70, 150, 50, 100])
        receipt_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ]))
        elements.append(receipt_table)
        elements.append(Spacer(1, 15))
        
        # Customer Details Section
        elements.append(Paragraph("Customer Details", self.styles['SectionHeader']))
        customer_info = [
            ["Name:", customer_data.get("name", "N/A")],
            ["Phone:", customer_data.get("phone", "N/A")],
            ["Email:", customer_data.get("email", "N/A")],
        ]
        if customer_data.get("address"):
            customer_info.append(["Address:", customer_data.get("address")])
        
        customer_table = Table(customer_info, colWidths=[80, 300])
        customer_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(customer_table)
        elements.append(Spacer(1, 10))
        
        # Property Details (if available)
        if property_data:
            elements.append(Paragraph("Property Details", self.styles['SectionHeader']))
            property_info = [
                ["Property:", property_data.get("display_name") or property_data.get("plot_number", "N/A")],
                ["Project:", property_data.get("project_name", "N/A")],
            ]
            if property_data.get("area"):
                property_info.append(["Area:", f"{property_data['area']} {property_data.get('area_unit', 'sq.ft')}"])
            
            property_table = Table(property_info, colWidths=[80, 300])
            property_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(property_table)
            elements.append(Spacer(1, 10))
        
        # Payment Details Section
        elements.append(Paragraph("Payment Details", self.styles['SectionHeader']))
        
        # Payment breakdown table
        payment_rows = [
            ["Description", "Amount"],
        ]
        
        # Main payment
        payment_desc = payment_data.get("description", "Payment")
        if payment_data.get("installment_number") is not None:
            if payment_data["installment_number"] == 0:
                payment_desc = "Down Payment"
            else:
                payment_desc = f"EMI Installment #{payment_data['installment_number']}"
        
        payment_rows.append([payment_desc, self._format_currency(payment_data.get("amount", 0))])
        
        # Late fee if any
        if payment_data.get("late_fee_paid", 0) > 0:
            payment_rows.append(["Late Fee Paid", self._format_currency(payment_data["late_fee_paid"])])
        
        # Total row
        total_amount = payment_data.get("amount", 0)
        payment_rows.append(["Total Received", self._format_currency(total_amount)])
        
        payment_table = Table(payment_rows, colWidths=[280, 100])
        payment_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            # Data rows
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            # Total row
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(payment_table)
        elements.append(Spacer(1, 15))
        
        # Payment Method Info
        method_info = [
            ["Payment Method:", payment_data.get("payment_method", "N/A").replace("_", " ").title()],
        ]
        if payment_data.get("transaction_id"):
            method_info.append(["Transaction ID:", payment_data["transaction_id"]])
        if payment_data.get("reference_number"):
            method_info.append(["Reference No:", payment_data["reference_number"]])
        
        method_table = Table(method_info, colWidths=[100, 280])
        method_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(method_table)
        elements.append(Spacer(1, 20))
        
        # Booking Summary (if available)
        if booking_data:
            elements.append(Paragraph("Booking Summary", self.styles['SectionHeader']))
            summary_info = [
                ["Total Booking Value:", self._format_currency(booking_data.get("total_amount", 0))],
                ["Total Paid:", self._format_currency(booking_data.get("paid_amount", 0))],
                ["Balance Due:", self._format_currency(booking_data.get("balance_amount", 0))],
            ]
            summary_table = Table(summary_info, colWidths=[150, 150])
            summary_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 20))
        
        # Amount in words
        amount_words = self._number_to_words(int(total_amount))
        elements.append(Paragraph(f"<b>Amount in Words:</b> {amount_words} Only", self.styles['Normal']))
        elements.append(Spacer(1, 30))
        
        # Signature area
        sig_data = [
            ["", "Authorized Signatory"],
            ["", ""],
            ["", "_____________________"],
        ]
        sig_table = Table(sig_data, colWidths=[300, 150])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 20),
        ]))
        elements.append(sig_table)
        elements.append(Spacer(1, 30))
        
        # Footer
        elements.append(Paragraph(
            "This is a computer-generated receipt. No signature required.",
            self.styles['Footer']
        ))
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%d %b %Y %H:%M')}",
            self.styles['Footer']
        ))
        
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _number_to_words(self, num: int) -> str:
        """Convert number to words (Indian format)"""
        ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen']
        tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        
        if num == 0:
            return 'Zero Rupees'
        
        def convert_chunk(n):
            if n < 20:
                return ones[n]
            elif n < 100:
                return tens[n // 10] + ('' if n % 10 == 0 else ' ' + ones[n % 10])
            else:
                return ones[n // 100] + ' Hundred' + ('' if n % 100 == 0 else ' and ' + convert_chunk(n % 100))
        
        result = ''
        
        if num >= 10000000:  # Crore
            result += convert_chunk(num // 10000000) + ' Crore '
            num %= 10000000
        
        if num >= 100000:  # Lakh
            result += convert_chunk(num // 100000) + ' Lakh '
            num %= 100000
        
        if num >= 1000:  # Thousand
            result += convert_chunk(num // 1000) + ' Thousand '
            num %= 1000
        
        if num > 0:
            result += convert_chunk(num)
        
        return result.strip() + ' Rupees'
    
    def generate_emi_schedule_pdf(
        self,
        booking_data: dict,
        customer_data: dict,
        property_data: dict,
        schedules: list,
        company_info: dict = None
    ) -> bytes:
        """Generate EMI schedule PDF document"""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15*mm,
            leftMargin=15*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )
        
        company = company_info or self.company_info
        elements = []
        
        # Header
        elements.append(Paragraph(company["name"], self.styles['CompanyName']))
        elements.append(Paragraph(company["address"], self.styles['CompanyInfo']))
        elements.append(Spacer(1, 10))
        
        # Title
        elements.append(Paragraph("EMI PAYMENT SCHEDULE", self.styles['ReceiptTitle']))
        elements.append(Spacer(1, 10))
        
        # Customer & Property Info
        info_data = [
            ["Customer:", customer_data.get("name", "N/A"), "Property:", property_data.get("display_name", "N/A")],
            ["Phone:", customer_data.get("phone", "N/A"), "Project:", property_data.get("project_name", "N/A")],
        ]
        info_table = Table(info_data, colWidths=[60, 150, 60, 150])
        info_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 15))
        
        # Summary
        total_amount = sum(s.get("due_amount", 0) for s in schedules)
        total_paid = sum(s.get("paid_amount", 0) for s in schedules)
        
        summary_data = [
            ["Total Amount:", self._format_currency(total_amount)],
            ["Total Paid:", self._format_currency(total_paid)],
            ["Balance:", self._format_currency(total_amount - total_paid)],
        ]
        summary_table = Table(summary_data, colWidths=[100, 120])
        summary_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 15))
        
        # Schedule Table
        schedule_headers = ["#", "Due Date", "Amount", "Paid", "Status"]
        schedule_rows = [schedule_headers]
        
        for s in schedules:
            row = [
                str(s.get("installment_number", "")),
                self._format_date(s.get("due_date", "")),
                self._format_currency(s.get("due_amount", 0)),
                self._format_currency(s.get("paid_amount", 0)),
                s.get("status", "pending").upper()
            ]
            schedule_rows.append(row)
        
        schedule_table = Table(schedule_rows, colWidths=[30, 80, 90, 90, 70])
        schedule_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (3, -1), 'RIGHT'),
            # Data
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        # Color code status
        for i, s in enumerate(schedules, 1):
            status = s.get("status", "pending")
            if status == "paid":
                schedule_table.setStyle(TableStyle([
                    ('BACKGROUND', (4, i), (4, i), colors.HexColor('#c6f6d5')),
                ]))
            elif status == "overdue":
                schedule_table.setStyle(TableStyle([
                    ('BACKGROUND', (4, i), (4, i), colors.HexColor('#fed7d7')),
                ]))
        
        elements.append(schedule_table)
        elements.append(Spacer(1, 20))
        
        # Footer
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%d %b %Y %H:%M')}",
            self.styles['Footer']
        ))
        
        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes


# Singleton instance
receipt_generator = ReceiptGenerator()
