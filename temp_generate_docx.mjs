import fs from "fs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import path from "path";
import os from "os";

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "Daftar Akun Bawaan (Demo) BloodLink",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                text: "Berikut adalah daftar seluruh akun bawaan (demo) beserta kata sandi yang pernah ditanamkan secara manual di dalam aplikasi:",
                spacing: { after: 200 }
            }),
            new Paragraph({ text: "Super Admin", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("superadmin@suroboyo.id")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("superadmin123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Super Admin")] }),
            new Paragraph({ spacing: { before: 200 } }),
            
            new Paragraph({ text: "Rumah Sakit Mitra (RS)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("admin@rumahsakita.com")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Admin RS A")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("admin@rumahsakitb.com")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Admin RS B")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("admin@rumahsakitc.com")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Admin RS C")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ text: "Palang Merah Indonesia (PMI)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("admin@pmia.org")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Admin PMI A")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("admin@pmib.org")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Admin PMI B")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("admin@pmic.org")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Admin PMI C")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ text: "Pendonor Darah", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("rizky@donor.id")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Rizky Pratama")] }),
            new Paragraph({ spacing: { before: 200 } }),

            new Paragraph({ text: "Kurir / Driver Logistik", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ children: [new TextRun({ text: "Email: ", bold: true }), new TextRun("driver@suroboyoblood.id")] }),
            new Paragraph({ children: [new TextRun({ text: "Password: ", bold: true }), new TextRun("demo123")] }),
            new Paragraph({ children: [new TextRun({ text: "Nama Pengguna: ", bold: true }), new TextRun("Budi Santoso")] }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    const outputPath = path.join(os.homedir(), "Dokumen", "Data_Akun_Demo_BloodLink.docx");
    fs.writeFileSync(outputPath, buffer);
    console.log("File berhasil dibuat di " + outputPath);
});
