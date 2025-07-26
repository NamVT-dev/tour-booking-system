const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

module.exports = class Email {
  constructor(user, data) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.data = data;
    this.from = `Fvivu <${process.env.SMTP_USER}>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAUTH2",
        user: process.env.SMTP_USER,
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../public/email/${template}.pug`,
      {
        firstName: this.firstName,
        subject,
        ...this.data,
      }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html, {
        wordwrap: 130,
      }),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Chào mừng tới với Fvivu!");
  }

  async sendConfirmEmail() {
    await this.send(
      "email_confirm",
      `${this.firstName}, mã pin của bạn là ${this.data?.pin}, vui lòng xác nhận địa chỉ email của bạn`
    );
  }

  async sendTourApproval() {
    const subject =
      this.data?.decision === "active"
        ? `Tour "${this.data.tourName}" đã được phê duyệt!`
        : `Tour "${this.data.tourName}" đã bị từ chối!`;
    await this.send("tourApproval", subject);
  }
  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Cài lại mật khẩu trên Fvivu (khả dụng trong 10p)"
    );
  }
  async sendPartnerWelcome() {
    await this.send("partnerWelcome", "Tài khoản đối tác Fvivu đã được tạo!");
  }
};
