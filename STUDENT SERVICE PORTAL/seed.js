const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

// Load Models
const userModel = require('./models/User');
const serviceModel = require('./models/Service');
const requestModel = require('./models/Request');
const notificationModel = require('./models/Notification');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const users = [
  {
    name: 'Sidhartha Reddy',
    email: 'sidhartha@vnrvjiet.in',
    password: 'password123',
    role: 'student'
  },
  {
    name: 'Pavan Sai Abhishek',
    email: 'pavan.club@vnrvjiet.in',
    password: 'password123',
    role: 'clubCoordinator'
  },
  {
    name: 'Bairu Vamshi Krishna',
    email: 'vamshi.faculty@vnrvjiet.in',
    password: 'password123',
    role: 'facultyCoordinator'
  },
  {
    name: 'Ishanth Kulkarni',
    email: 'ishanth.head@vnrvjiet.in',
    password: 'password123',
    role: 'deptHead'
  },
  {
    name: 'Balagolla Isaac Vivek',
    email: 'isaac.staff@vnrvjiet.in',
    password: 'password123',
    role: 'adminStaff'
  },
  {
    name: 'Manas',
    email: 'manas.exec@vnrvjiet.in',
    password: 'password123',
    role: 'executiveAdmin'
  }
];

const services = [
  // 1. Student Services
  {
    name: 'On-Duty (OD) Attendance & Medical Exemption',
    description: 'Request academic attendance credit waiver for hackathons, paper presentations, or medical hospital leave.',
    department: 'attendanceAcademic',
    category: 'studentServices',
    isActive: true,
    estimatedDays: 1
  },
  {
    name: 'Bonafide, Custodian & LOR Certificates',
    description: 'Issue official student bonafide certificate, original certificate custodian slip, or Letter of Recommendation.',
    department: 'certificatesCredentials',
    category: 'studentServices',
    isActive: true,
    estimatedDays: 2
  },
  {
    name: 'Duplicate ID Card & Exam Hall Ticket Reissue',
    description: 'Request replacement for lost institutional smartcard ID, barcode NFC tag, or semester end-exam admit card.',
    department: 'idCardsExams',
    category: 'studentServices',
    isActive: true,
    estimatedDays: 1
  },
  {
    name: 'Fee Concession & Scholarship Endorsement',
    description: 'Submit tuition fee payment receipts, e-Pass scholarship clearance, or fee installment review requests.',
    department: 'feesFinance',
    category: 'studentServices',
    isActive: true,
    estimatedDays: 3
  },

  // 2. Campus Permissions
  {
    name: 'College Bus Pass & Transport Route Change',
    description: 'Request semester institutional bus pass renewal, bus route transfer, or emergency transport authorization.',
    department: 'transportBus',
    category: 'campusPermissions',
    isActive: true,
    estimatedDays: 2
  },
  {
    name: 'Security Gate Pass & Outward Transit Slip',
    description: 'Official student late exit gate clearance or outward hardware/drone equipment movement permit.',
    department: 'securityGate',
    category: 'campusPermissions',
    isActive: true,
    estimatedDays: 1
  },
  {
    name: 'Kaksya Sastra & Venue Allocation Permission',
    description: 'Reserve KS Main Auditorium, SAC Seminar Halls, or Open Air Theatre for approved events and rehearsals.',
    department: 'venueFacilities',
    category: 'campusPermissions',
    isActive: true,
    estimatedDays: 3
  },
  {
    name: 'Off-Hours AI CoE Lab & Server Provisioning',
    description: 'Request isolated server cluster access, GPU CoE workstation access, or overnight laboratory permissions.',
    department: 'itNetworking',
    category: 'campusPermissions',
    isActive: true,
    estimatedDays: 2
  },

  // 3. Misc & Maintenance Services
  {
    name: 'Hostel & Infrastructure Repair Ticket',
    description: 'Report electrical faults, plumbing leaks, classroom projector/sound issues, or furniture repairs.',
    department: 'maintenanceRepairs',
    category: 'miscServices',
    isActive: true,
    estimatedDays: 2
  },
  {
    name: 'Lost & Found Property Claim & Locker Allocation',
    description: 'Claim recovered student belongings from proctor desk or request semester locker key allocation.',
    department: 'miscServices',
    category: 'miscServices',
    isActive: true,
    estimatedDays: 1
  }
];

// Import into DB
const importData = async () => {
  try {
    await userModel.deleteMany();
    await serviceModel.deleteMany();
    await requestModel.deleteMany();
    await notificationModel.deleteMany();

    const createdUsers = await userModel.create(users);
    const createdServices = await serviceModel.insertMany(services);

    const studentUser = createdUsers.find(u => u.role === 'student');
    const clubCoordinator = createdUsers.find(u => u.role === 'clubCoordinator');
    const deptHead = createdUsers.find(u => u.role === 'deptHead');

    const odService = createdServices.find(s => s.department === 'attendanceAcademic');
    const certService = createdServices.find(s => s.department === 'certificatesCredentials');
    const gateService = createdServices.find(s => s.department === 'securityGate');
    const venueService = createdServices.find(s => s.department === 'venueFacilities');
    const itService = createdServices.find(s => s.department === 'itNetworking');
    const repairService = createdServices.find(s => s.department === 'maintenanceRepairs');

    // Clean, streamlined sample requests in camelCase
    const sampleRequests = [
      // Active In-Flight Requests
      {
        service: odService._id,
        submittedBy: studentUser._id,
        payload: {
          title: 'OD Exemption for Smart India Hackathon Finale',
          justification: 'Selected as grand finalist for Smart India Hackathon Hub Node (5 Academic Days).',
          department: 'attendanceAcademic',
          proof: {
            proofType: 'Event Acceptance Letter',
            fileName: 'SIH2024_National_Grand_Finale_Confirmation.pdf',
            fileType: 'PDF',
            documentUrl: 'https://vnr.edu/storage/evidence/sih_invite_2024.pdf'
          }
        },
        status: 'pending'
      },
      {
        service: certService._id,
        submittedBy: studentUser._id,
        payload: {
          title: 'Urgent Bonafide Certificate for Passport Verification',
          justification: 'Scheduled appointment at Regional Passport Seva Kendra.',
          department: 'certificatesCredentials',
          proof: {
            proofType: 'Appointment Slip',
            fileName: 'Passport_Seva_Kendra_Appointment_Slip.pdf',
            fileType: 'PDF'
          }
        },
        status: 'inReview',
        processedBy: deptHead._id,
        adminRemarks: 'Administrative review active. Verification letter being drafted by Student Affairs registrar.'
      },
      {
        service: venueService._id,
        submittedBy: clubCoordinator._id,
        payload: {
          title: 'Kaksya Sastra KS-02 Stage & Acoustic Rig Allocation',
          justification: 'Annual technical club presentation and hackathon inauguration rehearsal.',
          department: 'venueFacilities',
          proof: {
            proofType: 'Club Faculty Endorsement',
            fileName: 'Club_Activity_Proposal_Signoff.pdf',
            fileType: 'PDF'
          }
        },
        status: 'inReview',
        processedBy: deptHead._id,
        adminRemarks: 'Checking venue conflict calendar with campus estate incharge.'
      },

      // Archived Requests
      {
        service: itService._id,
        submittedBy: studentUser._id,
        payload: {
          title: 'Off-hours AI CoE GPU Cluster Access',
          justification: 'Model training pipeline runs for deep learning research publication.',
          department: 'itNetworking'
        },
        status: 'approved',
        processedBy: deptHead._id,
        adminRemarks: 'Approved for CSE Chapter symposium. Lab keys to be issued by Estate Incharge Mr. N. Rao.'
      },
      {
        service: gateService._id,
        submittedBy: studentUser._id,
        payload: {
          title: 'Late Night Drone Testing Equipment Gate Pass',
          justification: 'Outdoor field telemetry tests for aerial robotics competition.',
          department: 'securityGate'
        },
        status: 'rejected',
        processedBy: deptHead._id,
        adminRemarks: 'Deficiency: Missing signed battery transport safety indemnity slip from Faculty Advisor.'
      },
      {
        service: repairService._id,
        submittedBy: studentUser._id,
        payload: {
          title: 'Classroom C-302 Overhead Projector HDMI Repair',
          justification: 'HDMI port loose, projector blinking during lecture hours in Block C Room 302.',
          department: 'maintenanceRepairs'
        },
        status: 'completed',
        processedBy: deptHead._id,
        adminRemarks: 'Estate technician replaced HDMI port board. Bench test verified OK.'
      }
    ];

    const insertedRequests = await requestModel.insertMany(sampleRequests);

    // Initial Notifications in camelCase
    await notificationModel.create([
      {
        recipient: studentUser._id,
        title: '[pending] Request Queued for Review',
        message: 'Your petition "OD Exemption for Smart India Hackathon Finale" was recorded under stage 1: pending.',
        type: 'requestSubmitted',
        requestId: insertedRequests[0]._id
      },
      {
        recipientRole: 'deptHead',
        title: '[newRequest] Service Request Filed',
        message: 'New petition submitted: "OD Exemption for Smart India Hackathon Finale" under attendanceAcademic. Requires departmental clearance.',
        type: 'requestSubmitted',
        requestId: insertedRequests[0]._id
      },
      {
        recipient: studentUser._id,
        title: '[inReview] Under Administrative Review',
        message: 'Docket #CERT-01 is currently under active verification by Department Head.',
        type: 'inReview',
        requestId: insertedRequests[1]._id
      }
    ]);

    console.log('Database seeded successfully with strict camelCase governance data.');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

// Destroy DB data
const deleteData = async () => {
  try {
    await userModel.deleteMany();
    await serviceModel.deleteMany();
    await requestModel.deleteMany();
    await notificationModel.deleteMany();

    console.log('Database wiped successfully.');
    process.exit();
  } catch (err) {
    console.error('Wipe error:', err);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}