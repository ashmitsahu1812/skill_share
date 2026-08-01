/**
 * Certificate Service
 * Generates PDF certificates using PDFKit + QR codes for verification
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { cloudinary } = require('../config/cloudinary');
const { Readable } = require('stream');

/**
 * Generate a PDF certificate and upload to Cloudinary
 * @param {object} params
 * @returns {{ pdfUrl: string, pdfPublicId: string }}
 */
async function generateCertificate({ holder, issuer, skill, category, score, verificationCode, issuedAt }) {
  return new Promise(async (resolve, reject) => {
    try {
      const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verificationCode}`;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      // Create PDF
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);

        // Upload to Cloudinary as raw file
        const uploadResult = await new Promise((res, rej) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'skillshare/certificates',
              resource_type: 'raw',
              public_id: `cert_${verificationCode}`,
              format: 'pdf',
            },
            (error, result) => {
              if (error) rej(error);
              else res(result);
            }
          );
          const readable = Readable.from(pdfBuffer);
          readable.pipe(uploadStream);
        });

        resolve({ pdfUrl: uploadResult.secure_url, pdfPublicId: uploadResult.public_id });
      });
      doc.on('error', reject);

      // ─── Certificate Design ────────────────────────────────────────────────

      const W = doc.page.width;
      const H = doc.page.height;

      // Background gradient effect with rectangles
      doc.rect(0, 0, W, H).fill('#0f0f1a');

      // Decorative border
      doc.rect(20, 20, W - 40, H - 40).lineWidth(2).stroke('#6c63ff');
      doc.rect(28, 28, W - 56, H - 56).lineWidth(0.5).stroke('#9d97ff');

      // Top accent bar
      doc.rect(20, 20, W - 40, 6).fill('#6c63ff');

      // Logo area — stylized "S" icon
      doc
        .fontSize(36)
        .fillColor('#6c63ff')
        .font('Helvetica-Bold')
        .text('✦ SKILLSHARE', 60, 55, { align: 'left', width: W - 120 });

      // "CERTIFICATE OF ACHIEVEMENT" title
      doc
        .fontSize(11)
        .fillColor('#9d97ff')
        .font('Helvetica')
        .text('CERTIFICATE OF ACHIEVEMENT', 60, 100, { align: 'center', width: W - 120, characterSpacing: 4 });

      // Decorative line under title
      doc.moveTo(W / 2 - 120, 118).lineTo(W / 2 + 120, 118).lineWidth(0.5).stroke('#6c63ff');

      // "This certifies that"
      doc
        .fontSize(13)
        .fillColor('#b0b0cc')
        .font('Helvetica')
        .text('This certifies that', 60, 145, { align: 'center', width: W - 120 });

      // Holder name — large
      doc
        .fontSize(38)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(holder.displayName, 60, 165, { align: 'center', width: W - 120 });

      // Underline
      const nameWidth = Math.min(holder.displayName.length * 22, W - 200);
      doc
        .moveTo(W / 2 - nameWidth / 2, 212)
        .lineTo(W / 2 + nameWidth / 2, 212)
        .lineWidth(1)
        .stroke('#6c63ff');

      // "has successfully demonstrated proficiency in"
      doc
        .fontSize(13)
        .fillColor('#b0b0cc')
        .font('Helvetica')
        .text('has successfully demonstrated proficiency in', 60, 225, { align: 'center', width: W - 120 });

      // Skill name — highlighted
      doc
        .fontSize(26)
        .fillColor('#a78bfa')
        .font('Helvetica-Bold')
        .text(skill, 60, 248, { align: 'center', width: W - 120 });

      // Score badge
      const scoreText = `Score: ${score}%`;
      doc
        .roundedRect(W / 2 - 60, 290, 120, 32, 8)
        .fill('#6c63ff');
      doc
        .fontSize(14)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(scoreText, W / 2 - 60, 299, { align: 'center', width: 120 });

      // Category pill
      doc
        .roundedRect(W / 2 - 80, 333, 160, 24, 5)
        .fill('#1a1a2e');
      doc
        .fontSize(10)
        .fillColor('#9d97ff')
        .font('Helvetica')
        .text(`Category: ${category}`, W / 2 - 80, 339, { align: 'center', width: 160 });

      // Bottom section — issued by, date, verification
      const bottomY = H - 100;
      doc.moveTo(60, bottomY).lineTo(W - 60, bottomY).lineWidth(0.3).stroke('#444466');

      // Issued by
      doc
        .fontSize(10)
        .fillColor('#6666aa')
        .font('Helvetica')
        .text(`Issued by: ${issuer.displayName}`, 60, bottomY + 12, { width: 220 });

      // Issue date
      doc
        .text(`Date: ${new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 60, bottomY + 28, { width: 220 });

      // Verification code
      doc
        .fontSize(8)
        .fillColor('#555577')
        .text(`Verification Code: ${verificationCode}`, 60, bottomY + 46, { width: 300 });

      // Verify URL
      doc
        .fontSize(8)
        .fillColor('#6c63ff')
        .text(`Verify at: ${verifyUrl}`, 60, bottomY + 58, { width: 350 });

      // QR Code (right side)
      doc.image(qrBuffer, W - 140, bottomY + 8, { width: 80, height: 80 });
      doc
        .fontSize(7)
        .fillColor('#666688')
        .text('Scan to verify', W - 140, bottomY + 90, { width: 80, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificate };
