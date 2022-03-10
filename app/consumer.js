const amqp = require('amqplib/callback_api');
const nodemailer = require("nodemailer");
require('dotenv/config');

const mailTransporter = nodemailer.createTransport({
  host: process.env.HOST,
  secure: true,
  port: process.env.PORT,
  auth: {
      user:process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
  },
});

amqp.connect(`amqp://${process.env.RABBIT_USER}:${process.env.RABBIT_PASSWORD}@${process.env.RABBIT_HOST}:${process.env.RABBIT_PORT}`, (err, conn) => {
  conn.createChannel((err, ch) => {
    const q = 'SEND_MAIL';
    const q_error = 'SEND_MAIL_ERROR';

    ch.assertQueue(q, { durable: false });
    ch.assertQueue(q_error, { durable: false });
    ch.prefetch(1);

    console.log(' [x] Awaiting send mail requests');

    ch.consume(q, function reply(msg) {
      console.log(msg.content.toString());
      const mail = JSON.parse(msg.content.toString());

      console.log(` [.] Subject ${mail.subject}`);
      const mailDetails = {
        from:process.env.MAIL_USERNAME,
        to: mail.to,
        subject: mail.subject,
        text: mail.text
      }
      mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
            mail.err = err.stack;
            ch.sendToQueue(q_error,
              Buffer.from(JSON.stringify(mail)),
              { correlationId: msg.properties.correlationId });
        } else {
            console.log("Email sent successfully");
        }
    });

      ch.ack(msg);
    });
  });
});
