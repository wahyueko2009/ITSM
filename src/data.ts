/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, ChangeRequest, Asset, KBArticle, SlaPolicy } from './types';

export const INITIAL_TICKETS: Ticket[] = [];

export const INITIAL_CHANGES: ChangeRequest[] = [];

export const INITIAL_SLA_POLICIES: SlaPolicy[] = [
  {
    id: 'SLA-001',
    category: 'Umum',
    priorityCode: 'P1',
    priorityName: 'Critical / Urgent',
    targetResponseHours: 0.25,
    targetResolutionHours: 4,
    slaResponsePercent: 99,
    slaResolutionPercent: 95,
    effectiveYear: 2026,
    description: 'Insiden kritis yang mengganggu operasional bisnis utama, sistem ERP tidak dapat digunakan, atau transaksi utama tidak dapat diproses termasuk pada pemenuhan kewajiban regulasi, proses audit, dan tutup buku (financial closing)'
  },
  {
    id: 'SLA-002',
    category: 'Umum',
    priorityCode: 'P2',
    priorityName: 'Tinggi / High',
    targetResponseHours: 0.5,
    targetResolutionHours: 8,
    slaResponsePercent: 99,
    slaResolutionPercent: 95,
    effectiveYear: 2026,
    description: 'Insiden yang berdampak pada fungsi utama aplikasi sehingga proses bisnis tidak berjalan optimal, namun sistem masih dapat diakses dan terdapat proses alternatif'
  },
  {
    id: 'SLA-003',
    category: 'Umum',
    priorityCode: 'P3',
    priorityName: 'Sedang / Medium',
    targetResponseHours: 1,
    targetResolutionHours: 72,
    slaResponsePercent: 99,
    slaResolutionPercent: 95,
    effectiveYear: 2026,
    description: 'Insiden yang tidak berdampak langsung pada operasional utama. Sistem tetap berjalan namun terdapat gangguan pada beberapa fungsi atau laporan'
  },
  {
    id: 'SLA-004',
    category: 'Umum',
    priorityCode: 'P4',
    priorityName: 'Rendah / Low',
    targetResponseHours: 1,
    targetResolutionHours: 120,
    slaResponsePercent: 99,
    slaResolutionPercent: 95,
    effectiveYear: 2026,
    description: 'Permintaan informasi, bantuan penggunaan, konfigurasi minor, atau gangguan yang tidak mempengaruhi proses operasional.'
  }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'AST-SRV-001',
    name: 'Server DB Produksi (database-01)',
    type: 'Server',
    serialNumber: 'DELL-R750-7798A',
    status: 'Aktif',
    owner: 'Tim Database',
    location: 'Data Center Jakarta - Rack B3',
    ipAddress: '10.100.2.11',
    linkedIncidentCount: 1,
    purchaseDate: '2024-03-12'
  },
  {
    id: 'AST-NET-002',
    name: 'Access Point Ubiquiti Lantai 3 Timur (AP-R3-E01)',
    type: 'Router',
    serialNumber: 'UAP-AC-HD-9945F',
    status: 'Masa Perbaikan',
    owner: 'Tim Network',
    location: 'Gedung Pusat - Lantai 3 Sayap Timur',
    ipAddress: '10.100.10.45',
    linkedIncidentCount: 1,
    purchaseDate: '2025-01-20'
  },
  {
    id: 'AST-LAP-001',
    name: 'MacBook Pro 16 M3 - Farhan Hakim',
    type: 'Workstation',
    serialNumber: 'C02HG89KQ05D',
    status: 'Aktif',
    owner: 'Farhan Hakim',
    location: 'Remote / Work From Home',
    ipAddress: '192.168.1.134',
    linkedIncidentCount: 0,
    purchaseDate: '2025-05-15'
  },
  {
    id: 'AST-LAP-002',
    name: 'Lenovo ThinkPad T14 Gen 2 - Adi Chandra',
    type: 'Workstation',
    serialNumber: 'PF-3C77XY2',
    status: 'Aktif',
    owner: 'Adi Chandra',
    location: 'Gedung Pusat - Lantai 2 Operations',
    ipAddress: '10.100.5.122',
    linkedIncidentCount: 1,
    purchaseDate: '2023-11-01'
  },
  {
    id: 'AST-LIC-001',
    name: 'Lisensi Team Adobe Creative Cloud Enterprise',
    type: 'Lisensi Software',
    serialNumber: 'LIC-ADOBE-CC-100USR',
    status: 'Aktif',
    owner: 'Siti Rahma',
    location: 'Konsol Cloud Admin Adobe',
    linkedIncidentCount: 1,
    purchaseDate: '2025-06-01'
  }
];

export const INITIAL_KB: KBArticle[] = [
  {
    id: 'KB-101',
    title: 'Bagaimana Cara Reset Mandiri Akun VPN (FortiClient)',
    content: '## Panduan Mengatasi Blokir / Reset VPN FortiClient\n\nJika Anda mendapatkan error **"Access Denied: Account Locked"**, hal ini umumnya terjadi karena Anda salah mengetikkan password Active Directory sebanyak 3 kali berturut-turut.\n\n### Langkah-langkah Reset Mandiri:\n1. Buka portal mandiri di **https://selfservice.company.com**.\n2. Masukkan email kantor dan nomor telepon terdaftar.\n3. Masukkan kode verifikasi OTP yang dikirimkan via SMS/WhatsApp.\n4. Pilih menu **"Buka Blokir VPN & Akun AD"**.\n5. Sistem secara otomatis akan meriset counter kesalahan login ke 0.\n\n*Catatan: VPN membutuhkan waktu 2-3 menit untuk mereplikasi perubahan sebelum Anda dapat mencoba login kembali.*',
    category: 'Akses & Akun',
    author: 'Siti Rahma (IT Support)',
    views: 342,
    usefulnessRate: 98,
    createdAt: '2025-02-12T04:20:00Z'
  },
  {
    id: 'KB-102',
    title: 'Pengaturan Prosedur Pengajuan WiFi Tamu / Guest',
    content: '## Pengajuan Kredensial WiFi Guest\n\nUntuk tamu eksternal, klien, atau vendor yang berkunjung ke kantor, gunakan modul prosedur berikut untuk memberikan akses internet:\n\n### Metode Cepat:\n1. Tamu mendaftarkan diri di tablet resepsionis lobi depan.\n2. Tablet secara otomatis memancarkan kode QR WiFi Tamu sekali pakai.\n3. WiFi Tamu memiliki bandwidth terlimit (maksimal 10 Mbps per perangkat) dan kedaluwarsa dalam **12 Jam**.\n\nUntuk pengajuan jangka panjang (>3 hari), silakan buat tiket insiden / layanan baru bermacam kategori "Akses & Akun" dengan menyebutkan nama tamu, surat tugas, dan durasi kunjungan.',
    category: 'Jaringan',
    author: 'Yudi Pratama',
    views: 125,
    usefulnessRate: 92,
    createdAt: '2025-04-18T09:00:00Z'
  },
  {
    id: 'KB-103',
    title: 'Aturan & Standar Pembagian Laptop Karyawan Baru',
    content: '## Kebijakan Alokasi Perangkat IT Perusahaan\n\nSetiap karyawan baru berhak mendapatkan fasilitas laptop sesuai departemen operasional masing-masing:\n\n- **Rekayasa Perangkat Lunak / IT Dev**: MacBook Pro 16" M3 Pro ATAU ThinkPad P16s (RAM 32GB, 1TB SSD).\n- **Desain & Creative**: iMac 24" / MacBook Pro 14" M3 (RAM 16GB, 512GB SSD).\n- **Operations, Finance, Sales, HR**: Lenovo ThinkPad T14 / L14 (RAM 16GB, 512GB SSD).\n\nSemua aset didaftarkan di CMDB lokal sebelum diserahkan oleh tim Service Desk.',
    category: 'Hardware',
    author: 'Siti Rahma (IT Support)',
    views: 89,
    usefulnessRate: 85,
    createdAt: '2024-09-01T07:15:00Z'
  }
];
