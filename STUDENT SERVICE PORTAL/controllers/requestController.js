const requestModel = require('../models/Request');
const serviceModel = require('../models/Service');
const { sendNotification } = require('../utils/notify');

// @desc    Submit a new service request
// @route   POST /api/v1/requests
// @access  Private (Logged-in users)
exports.createRequest = async (req, res) => {
  try {
    const { serviceId, department, payload, title, justification, proof } = req.body;

    let service;
    if (serviceId) {
      service = await serviceModel.findOne({ _id: serviceId, isActive: true });
    } else if (department) {
      service = await serviceModel.findOne({ department, isActive: true });
    }

    if (!service) {
      service = await serviceModel.findOne({ isActive: true });
    }

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found or currently inactive' });
    }

    // Streamlined payload: Store only essential request parameters in camelCase
    const cleanPayload = {
      title: title || payload?.title || service.name,
      justification: justification || payload?.justification || payload?.notes || '',
      department: department || service.department,
      proof: proof || (payload?.proofs ? {
        fileName: payload.proofs.fileName,
        fileType: payload.proofs.fileType,
        documentUrl: payload.proofs.documentUrl,
        proofType: payload.proofs.proofType
      } : (payload?.proof ? payload.proof : null))
    };

    const newRequest = await requestModel.create({
      service: service._id,
      submittedBy: req.user.id,
      payload: cleanPayload,
      status: 'pending'
    });

    // Notify HOD (deptHead)
    await sendNotification({
      recipientRole: 'deptHead',
      title: '[newRequest] Service Request Filed',
      message: `New petition submitted: "${cleanPayload.title}" under ${service.department}. Requires departmental clearance.`,
      type: 'requestSubmitted',
      requestId: newRequest._id
    });

    // Notify Student Requester
    await sendNotification({
      recipient: req.user.id,
      title: '[pending] Request Queued for Review',
      message: `Your petition "${cleanPayload.title}" was recorded under stage 1: pending.`,
      type: 'requestSubmitted',
      requestId: newRequest._id
    });

    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all requests submitted by the logged-in user
// @route   GET /api/v1/requests/myRequests
// @access  Private (Logged-in users)
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await requestModel.find({ submittedBy: req.user.id })
      .populate('service', 'name department category')
      .populate('processedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a pending request payload
// @route   PATCH /api/v1/requests/:id
// @access  Private (Logged-in users)
exports.updateMyRequest = async (req, res) => {
  try {
    let targetRequest = await requestModel.findById(req.params.id);

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (targetRequest.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this request' });
    }

    // State Immutability Lock: Cannot edit once processing has begun
    if (targetRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot edit a request that is already being processed' });
    }

    const { title, justification, proof, payload } = req.body;
    const updatedPayload = {
      ...targetRequest.payload,
      title: title || payload?.title || targetRequest.payload?.title,
      justification: justification || payload?.justification || targetRequest.payload?.justification,
      proof: proof || payload?.proof || targetRequest.payload?.proof
    };

    targetRequest = await requestModel.findByIdAndUpdate(
      req.params.id,
      { payload: updatedPayload },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: targetRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Cancel a pending request
// @route   DELETE /api/v1/requests/:id
// @access  Private (Logged-in users)
exports.cancelMyRequest = async (req, res) => {
  try {
    const targetRequest = await requestModel.findById(req.params.id);

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (targetRequest.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
    }

    if (targetRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a request that is already being processed' });
    }

    targetRequest.status = 'cancelled';
    await targetRequest.save();

    const shortId = targetRequest._id.toString().slice(-6).toUpperCase();

    // Send notifications in camelCase
    await sendNotification({
      recipientRole: 'deptHead',
      title: '[cancelled] Petition Cancelled by Student',
      message: `Student cancelled request #${shortId}.`,
      type: 'cancelled',
      requestId: targetRequest._id
    });

    await sendNotification({
      recipient: req.user.id,
      title: '[cancelled] Request Cancelled Successfully',
      message: `You cancelled request #${shortId}. Docket transferred to archive.`,
      type: 'cancelled',
      requestId: targetRequest._id
    });

    res.status(200).json({ success: true, message: 'Request cancelled successfully', data: targetRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};