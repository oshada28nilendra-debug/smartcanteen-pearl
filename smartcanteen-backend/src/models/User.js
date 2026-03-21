const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const ROLES = Object.freeze({ STUDENT: 'student', VENDOR: 'vendor', ADMIN: 'admin' });
const VENDOR_STATUS  = Object.freeze({ PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' });
const ACCOUNT_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive', BANNED: 'banned' });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, 'Name is required'],
      trim: true, minlength: [2, 'Min 2 chars'], maxlength: [60, 'Max 60 chars'],
    },
    email: {
      type: String, required: [true, 'Email is required'],
      unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: {
      type: String, required: [true, 'Password is required'],
      minlength: [8, 'Min 8 chars'], select: false,
    },
    role:          { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT },
    accountStatus: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.ACTIVE },

    vendorStatus: { type: String, enum: [...Object.values(VENDOR_STATUS), null], default: null },
    vendorProfile: {
      businessName: { type: String, trim: true, default: '' },
      description:  { type: String, trim: true, default: '' },
      contactPhone: { type: String, trim: true, default: '' },
      // Image stored as base64 string or https URL
      bannerImage:  { type: String, default: null },
      paymentDetails: {
        bankName:      { type: String, trim: true, default: '' },
        bankBranch:    { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        accountName:   { type: String, trim: true, default: '' },
      },
    },

    studentId:    { type: String, trim: true, sparse: true },
    refreshToken: { type: String, select: false },

    passwordChangedAt: Date,
    deactivatedAt: Date,
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt:    Date,
    approvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt:    Date,
    rejectedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Only one index on email (unique:true above already creates one)
userSchema.index({ role: 1, vendorStatus: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword      = async function (candidate) { return bcrypt.compare(candidate, this.password); };
userSchema.methods.passwordChangedAfter = function (jwtIat) { return this.passwordChangedAt ? jwtIat < Math.floor(this.passwordChangedAt.getTime() / 1000) : false; };
userSchema.methods.isAccessible         = function () { return this.accountStatus === ACCOUNT_STATUS.ACTIVE; };
userSchema.methods.isVendorApproved     = function () { return this.role === ROLES.VENDOR && this.vendorStatus === VENDOR_STATUS.APPROVED; };
userSchema.methods.toJWTPayload         = function () { return { id: this._id, role: this.role, vendorStatus: this.vendorStatus }; };
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
};

module.exports = { User: mongoose.model('User', userSchema), ROLES, VENDOR_STATUS, ACCOUNT_STATUS };