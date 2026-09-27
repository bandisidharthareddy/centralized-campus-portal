const requestModel = require('../models/Request');
const { sendNotification } = require('../utils/notify');

// @desc    Get all requests for administrative scrutiny
// @route   GET /api/v1/admin/all
// @access  Private (Admins / Department Heads only)
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await requestModel.find()
      .populate('service', 'name department category')
      .populate('submittedBy', 'name email role')
      .populate('processedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update request status and record official remarks
// @route   PATCH /api/v1/admin/:id/status
// @access  Private (Admins / Department Heads only)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, adminRemarks } = req.body;

    const targetRequest = await requestModel.findById(req.params.id);

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'Request docket not found' });
    }

    if (status) targetRequest.status = status;
    if (adminRemarks !== undefined) targetRequest.adminRemarks = adminRemarks;

    // Admin Accountability: Affix processor ID from verified JWT session
    targetRequest.processedBy = req.user.id;
    await targetRequest.save();

    const shortId = targetRequest._id.toString().slice(-6).toUpperCase();

    // 1. Notify the student who submitted the request (zero emojis, camelCase type)
    await sendNotification({
      recipient: targetRequest.submittedBy,
      title: `[${status}] Docket Verdict: ${status}`,
      message: `Your petition #${shortId} was updated to status ${status} by Department Head.${adminRemarks ? ' Official Remark: ' + adminRemarks : ''}`,
      type: status,
      requestId: targetRequest._id
    });

    // 2. Notify the Admin / HOD confirming the verdict
    await sendNotification({
      recipient: req.user.id,
      title: `[${status}] Verdict Recorded`,
      message: `You updated docket #${shortId} to ${status}.`,
      type: status,
      requestId: targetRequest._id
    });

    res.status(200).json({ success: true, data: targetRequest });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};