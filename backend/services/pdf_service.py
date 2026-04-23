"""
PDF Generation Service for ExlainERP
Generates professional PDFs for:
- Booking Confirmation Letter
- Payment Receipt
- Payment Schedule/EMI Statement
- Property Allotment Letter
"""

from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY
import locale

# Try to set Indian locale for currency formatting
try:
    locale.setlocale(locale.LC_ALL, 'en_IN.UTF-8')
except:
    pass

def format_currency(amount):
    """Format amount in Indian Rupees"""
    if amount is None:
        return "₹0"
    try:
        return f"₹{amount:,.2f}"
    except:
        return f"₹{amount}"

def format_date(date_str):
    """Format date string to readable format"""
    if not date_str:
        return "-"
    try:
        if isinstance(date_str, str):
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            dt = date_str
        return dt.strftime("%d %b %Y")
    except:
        return str(date_str)[:10] if date_str else "-"

def get_styles():
    """Get custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=20,
        textColor=colors.HexColor('#1e40af')
    ))
    
    # Subtitle
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=30,
        textColor=colors.HexColor('#64748b')
    ))
    
    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor('#1e40af'),
        borderPadding=(5, 5, 5, 5)
    ))
    
    # Body text - use existing BodyText and modify
    styles['BodyText'].fontSize = 10
    styles['BodyText'].leading = 14
    styles['BodyText'].alignment = TA_JUSTIFY
    
    # Right aligned
    styles.add(ParagraphStyle(
        name='RightAlign',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_RIGHT
    ))
    
    # Footer
    styles.add(ParagraphStyle(
        name='DocFooter',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#94a3b8')
    ))
    
    return styles


class PDFGenerator:
    """Main PDF Generator class"""
    
    def __init__(self, company_info: dict = None):
        self.company_info = company_info or {}
        self.styles = get_styles()
    
    def _create_header(self, elements, title: str):
        """Create document header with company info"""
        company_name = self.company_info.get('name', 'ExlainERP')
        company_address = self.company_info.get('address', '')
        company_phone = self.company_info.get('phone', '')
        company_email = self.company_info.get('email', '')
        
        # Company name
        elements.append(Paragraph(f"<b>{company_name}</b>", self.styles['DocTitle']))
        
        # Company contact info
        if company_address or company_phone or company_email:
            contact_parts = []
            if company_address:
                contact_parts.append(company_address)
            if company_phone:
                contact_parts.append(f"Phone: {company_phone}")
            if company_email:
                contact_parts.append(f"Email: {company_email}")
            elements.append(Paragraph(" | ".join(contact_parts), self.styles['DocSubtitle']))
        
        # Horizontal line
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        elements.append(Spacer(1, 10))
        
        # Document title
        elements.append(Paragraph(title, self.styles['DocTitle']))
        elements.append(Spacer(1, 20))
    
    def _create_footer(self, elements):
        """Create document footer"""
        elements.append(Spacer(1, 30))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0')))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(
            f"Generated on {datetime.now().strftime('%d %b %Y at %H:%M')} | This is a computer-generated document",
            self.styles['DocFooter']
        ))
        elements.append(Paragraph(
            f"Powered by ExlainERP - Real Estate Automation Software",
            self.styles['DocFooter']
        ))
    
    def generate_booking_confirmation(self, booking_data: dict) -> BytesIO:
        """
        Generate Booking Confirmation Letter
        
        Required fields in booking_data:
        - booking_id, booking_date
        - customer_name, customer_phone, customer_email, customer_address
        - project_name, property_number, block, area, facing
        - total_price, booking_amount, balance_amount
        - payment_schedule (list of installments)
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=30, bottomMargin=30)
        elements = []
        
        self._create_header(elements, "BOOKING CONFIRMATION")
        
        # Booking reference
        elements.append(Paragraph(
            f"<b>Booking Reference:</b> {booking_data.get('booking_id', 'N/A')[:8].upper()}",
            self.styles['RightAlign']
        ))
        elements.append(Paragraph(
            f"<b>Date:</b> {format_date(booking_data.get('booking_date'))}",
            self.styles['RightAlign']
        ))
        elements.append(Spacer(1, 20))
        
        # Customer details
        elements.append(Paragraph("CUSTOMER DETAILS", self.styles['SectionHeader']))
        customer_data = [
            ['Name', booking_data.get('customer_name', '-')],
            ['Phone', booking_data.get('customer_phone', '-')],
            ['Email', booking_data.get('customer_email', '-')],
            ['Address', booking_data.get('customer_address', '-')],
        ]
        customer_table = Table(customer_data, colWidths=[120, 350])
        customer_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(customer_table)
        elements.append(Spacer(1, 15))
        
        # Property details
        elements.append(Paragraph("PROPERTY DETAILS", self.styles['SectionHeader']))
        property_data = [
            ['Project', booking_data.get('project_name', '-')],
            ['Plot/Unit No.', booking_data.get('property_number', '-')],
            ['Block/Phase', booking_data.get('block', '-')],
            ['Area', f"{booking_data.get('area', '-')} sq.ft."],
            ['Facing', booking_data.get('facing', '-')],
        ]
        property_table = Table(property_data, colWidths=[120, 350])
        property_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(property_table)
        elements.append(Spacer(1, 15))
        
        # Financial details
        elements.append(Paragraph("FINANCIAL DETAILS", self.styles['SectionHeader']))
        financial_data = [
            ['Total Property Value', format_currency(booking_data.get('total_price'))],
            ['Booking Amount Paid', format_currency(booking_data.get('booking_amount'))],
            ['Balance Amount', format_currency(booking_data.get('balance_amount'))],
        ]
        financial_table = Table(financial_data, colWidths=[200, 270])
        financial_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, -1), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f1f5f9')),
        ]))
        elements.append(financial_table)
        elements.append(Spacer(1, 20))
        
        # Payment schedule if available
        schedule = booking_data.get('payment_schedule', [])
        if schedule:
            elements.append(Paragraph("PAYMENT SCHEDULE", self.styles['SectionHeader']))
            schedule_data = [['Installment', 'Due Date', 'Amount', 'Status']]
            for item in schedule:
                schedule_data.append([
                    item.get('installment_name', '-'),
                    format_date(item.get('due_date')),
                    format_currency(item.get('amount')),
                    item.get('status', 'Pending')
                ])
            schedule_table = Table(schedule_data, colWidths=[150, 100, 120, 100])
            schedule_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('ALIGN', (3, 0), (3, -1), 'CENTER'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ]))
            elements.append(schedule_table)
        
        # Terms and conditions
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("TERMS & CONDITIONS", self.styles['SectionHeader']))
        terms = [
            "1. This booking is subject to final agreement execution within 30 days.",
            "2. The booking amount is non-refundable in case of cancellation by the buyer.",
            "3. All payments should be made via cheque/NEFT/RTGS in favor of the company.",
            "4. Property registration and stamp duty charges are extra as per government rates.",
            "5. Possession will be handed over after full payment and registration completion.",
        ]
        for term in terms:
            elements.append(Paragraph(term, self.styles['BodyText']))
            elements.append(Spacer(1, 5))
        
        # Signatures
        elements.append(Spacer(1, 40))
        sig_data = [
            ['_____________________', '_____________________'],
            ['Customer Signature', 'Authorized Signatory'],
            [booking_data.get('customer_name', ''), self.company_info.get('name', '')]
        ]
        sig_table = Table(sig_data, colWidths=[235, 235])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
        ]))
        elements.append(sig_table)
        
        self._create_footer(elements)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_payment_receipt(self, payment_data: dict) -> BytesIO:
        """
        Generate Payment Receipt
        
        Required fields in payment_data:
        - receipt_number, payment_date, payment_mode
        - customer_name, customer_phone
        - project_name, property_number
        - amount, amount_in_words
        - payment_for (description)
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=30, bottomMargin=30)
        elements = []
        
        self._create_header(elements, "PAYMENT RECEIPT")
        
        # Receipt info
        receipt_info = [
            [f"Receipt No: {payment_data.get('receipt_number', 'N/A')}", 
             f"Date: {format_date(payment_data.get('payment_date'))}"]
        ]
        receipt_table = Table(receipt_info, colWidths=[235, 235])
        receipt_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(receipt_table)
        elements.append(Spacer(1, 20))
        
        # Received from
        elements.append(Paragraph(
            f"Received with thanks from <b>{payment_data.get('customer_name', '-')}</b>",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 15))
        
        # Payment details table
        details = [
            ['Customer Phone', payment_data.get('customer_phone', '-')],
            ['Project', payment_data.get('project_name', '-')],
            ['Plot/Unit No.', payment_data.get('property_number', '-')],
            ['Payment For', payment_data.get('payment_for', 'Property Payment')],
            ['Payment Mode', payment_data.get('payment_mode', '-')],
        ]
        
        if payment_data.get('cheque_number'):
            details.append(['Cheque/Ref No.', payment_data.get('cheque_number')])
        if payment_data.get('bank_name'):
            details.append(['Bank', payment_data.get('bank_name')])
        
        details_table = Table(details, colWidths=[150, 320])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 20))
        
        # Amount box
        amount_data = [
            ['AMOUNT RECEIVED', format_currency(payment_data.get('amount'))],
        ]
        amount_table = Table(amount_data, colWidths=[300, 170])
        amount_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ]))
        elements.append(amount_table)
        
        # Amount in words
        if payment_data.get('amount_in_words'):
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(
                f"<i>Amount in words: {payment_data.get('amount_in_words')} Only</i>",
                self.styles['BodyText']
            ))
        
        # Note
        elements.append(Spacer(1, 30))
        elements.append(Paragraph(
            "<b>Note:</b> This receipt is valid subject to realization of cheque/payment. "
            "Please retain this receipt for your records.",
            self.styles['BodyText']
        ))
        
        # Signature
        elements.append(Spacer(1, 50))
        sig_data = [
            ['', '_____________________'],
            ['', 'Authorized Signatory'],
            ['', self.company_info.get('name', '')]
        ]
        sig_table = Table(sig_data, colWidths=[300, 170])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
        ]))
        elements.append(sig_table)
        
        self._create_footer(elements)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_payment_schedule(self, schedule_data: dict) -> BytesIO:
        """
        Generate Payment Schedule / EMI Statement
        
        Required fields:
        - customer_name, customer_phone
        - project_name, property_number
        - total_amount, paid_amount, pending_amount
        - installments (list with: name, due_date, amount, status, paid_date)
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=30, bottomMargin=30)
        elements = []
        
        self._create_header(elements, "PAYMENT SCHEDULE")
        
        # Customer & Property info
        info_data = [
            ['Customer', schedule_data.get('customer_name', '-'), 'Project', schedule_data.get('project_name', '-')],
            ['Phone', schedule_data.get('customer_phone', '-'), 'Plot No.', schedule_data.get('property_number', '-')],
        ]
        info_table = Table(info_data, colWidths=[70, 165, 70, 165])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        # Summary
        elements.append(Paragraph("PAYMENT SUMMARY", self.styles['SectionHeader']))
        summary_data = [
            ['Total Amount', format_currency(schedule_data.get('total_amount'))],
            ['Amount Paid', format_currency(schedule_data.get('paid_amount'))],
            ['Pending Amount', format_currency(schedule_data.get('pending_amount'))],
        ]
        summary_table = Table(summary_data, colWidths=[350, 120])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fef2f2')),
            ('TEXTCOLOR', (1, -1), (1, -1), colors.HexColor('#dc2626')),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Installments table
        elements.append(Paragraph("INSTALLMENT DETAILS", self.styles['SectionHeader']))
        installments = schedule_data.get('installments', [])
        
        inst_data = [['#', 'Installment', 'Due Date', 'Amount', 'Status', 'Paid On']]
        for i, inst in enumerate(installments, 1):
            status = inst.get('status', 'Pending')
            status_color = '✓ Paid' if status == 'Paid' else ('⏳ Due' if status == 'Due' else '○ Upcoming')
            inst_data.append([
                str(i),
                inst.get('name', f'Installment {i}'),
                format_date(inst.get('due_date')),
                format_currency(inst.get('amount')),
                status_color,
                format_date(inst.get('paid_date')) if inst.get('paid_date') else '-'
            ])
        
        inst_table = Table(inst_data, colWidths=[30, 130, 80, 90, 70, 70])
        inst_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
            ('ALIGN', (4, 0), (4, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(inst_table)
        
        self._create_footer(elements)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_allotment_letter(self, allotment_data: dict) -> BytesIO:
        """
        Generate Property Allotment Letter
        
        Required fields:
        - allotment_date, allotment_number
        - customer_name, customer_phone, customer_address
        - project_name, property_number, block, area, facing, floor
        - total_price, price_per_sqft
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=30, bottomMargin=30)
        elements = []
        
        self._create_header(elements, "ALLOTMENT LETTER")
        
        # Reference and date
        elements.append(Paragraph(
            f"<b>Ref:</b> {allotment_data.get('allotment_number', 'N/A')}",
            self.styles['BodyText']
        ))
        elements.append(Paragraph(
            f"<b>Date:</b> {format_date(allotment_data.get('allotment_date'))}",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 20))
        
        # To address
        elements.append(Paragraph("<b>To,</b>", self.styles['BodyText']))
        elements.append(Paragraph(f"<b>{allotment_data.get('customer_name', '-')}</b>", self.styles['BodyText']))
        elements.append(Paragraph(allotment_data.get('customer_address', '-'), self.styles['BodyText']))
        elements.append(Paragraph(f"Phone: {allotment_data.get('customer_phone', '-')}", self.styles['BodyText']))
        elements.append(Spacer(1, 20))
        
        # Subject
        elements.append(Paragraph(
            f"<b>Subject: Allotment of Plot/Unit No. {allotment_data.get('property_number', '-')} "
            f"in {allotment_data.get('project_name', '-')}</b>",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 15))
        
        # Body
        elements.append(Paragraph(
            f"Dear {allotment_data.get('customer_name', 'Sir/Madam')},",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 10))
        
        body_text = f"""
        We are pleased to inform you that the following property has been allotted in your name 
        as per your application and payment of booking amount. The details of the allotted property are as follows:
        """
        elements.append(Paragraph(body_text, self.styles['BodyText']))
        elements.append(Spacer(1, 15))
        
        # Property details
        property_details = [
            ['Project Name', allotment_data.get('project_name', '-')],
            ['Plot/Unit No.', allotment_data.get('property_number', '-')],
            ['Block/Phase', allotment_data.get('block', '-')],
            ['Floor', allotment_data.get('floor', '-')],
            ['Area', f"{allotment_data.get('area', '-')} sq.ft."],
            ['Facing', allotment_data.get('facing', '-')],
            ['Rate per sq.ft.', format_currency(allotment_data.get('price_per_sqft'))],
            ['Total Value', format_currency(allotment_data.get('total_price'))],
        ]
        
        prop_table = Table(property_details, colWidths=[150, 320])
        prop_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0fdf4')),
        ]))
        elements.append(prop_table)
        elements.append(Spacer(1, 20))
        
        # Closing
        closing_text = """
        This allotment is subject to the terms and conditions of the agreement to be executed. 
        Please complete the remaining formalities and payments as per the agreed schedule.
        
        We welcome you to our project and assure you of our best services at all times.
        """
        elements.append(Paragraph(closing_text, self.styles['BodyText']))
        elements.append(Spacer(1, 20))
        
        elements.append(Paragraph("Thanking you,", self.styles['BodyText']))
        elements.append(Paragraph(f"For <b>{self.company_info.get('name', 'ExlainERP')}</b>", self.styles['BodyText']))
        
        # Signature
        elements.append(Spacer(1, 40))
        elements.append(Paragraph("_____________________", self.styles['BodyText']))
        elements.append(Paragraph("Authorized Signatory", self.styles['BodyText']))
        
        self._create_footer(elements)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer


# Utility function to convert number to words (Indian format)
def number_to_words(num):
    """Convert number to words in Indian format"""
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    if num == 0:
        return 'Zero'
    
    def words(n):
        if n < 20:
            return ones[n]
        elif n < 100:
            return tens[n // 10] + ('' if n % 10 == 0 else ' ' + ones[n % 10])
        elif n < 1000:
            return ones[n // 100] + ' Hundred' + ('' if n % 100 == 0 else ' ' + words(n % 100))
        elif n < 100000:
            return words(n // 1000) + ' Thousand' + ('' if n % 1000 == 0 else ' ' + words(n % 1000))
        elif n < 10000000:
            return words(n // 100000) + ' Lakh' + ('' if n % 100000 == 0 else ' ' + words(n % 100000))
        else:
            return words(n // 10000000) + ' Crore' + ('' if n % 10000000 == 0 else ' ' + words(n % 10000000))
    
    rupees = int(num)
    paise = int(round((num - rupees) * 100))
    
    result = 'Rupees ' + words(rupees)
    if paise > 0:
        result += ' and ' + words(paise) + ' Paise'
    
    return result
