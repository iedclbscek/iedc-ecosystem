import EmailTemplate from "../models/EmailTemplate.js";

const PASSWORD_RESET_HTML = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

<head>
	<title></title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]>
<xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
<![endif]--><!--[if !mso]><!--><!--<![endif]-->
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
		}

		sup,
		sub {
			font-size: 75%;
			line-height: 0;
		}

		@media (max-width:620px) {

			.desktop_hide table.icons-inner,
			.social_block.desktop_hide .social-table {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.mobile_hide {
				display: none;
			}

			.row-content {
				width: 100% !important;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}
		}
	</style><!--[if mso ]><style>sup, sub { font-size: 100% !important; } sup { mso-text-raise:10% } sub { mso-text-raise:-10% }</style> <![endif]-->
</head>

<body class="body" style="margin: 0; background-color: #091548; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #091548;">
		<tbody>
			<tr>
				<td>
					<table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #091548; background-image: url('https://d1oco4z2z1fhwp.cloudfront.net/templates/default/3986/background_2.png'); background-position: center top; background-repeat: repeat;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 15px; padding-left: 10px; padding-right: 10px; padding-top: 5px; vertical-align: top;">
													<div class="spacer_block block-1" style="height:8px;line-height:8px;font-size:1px;">&#8202;</div>
													<table class="image_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="width:100%;padding-right:0px;padding-left:0px;">
																<div class="alignment" align="center">
																	<div style="max-width: 232px;"><img src="https://d1oco4z2z1fhwp.cloudfront.net/templates/default/3986/header3.png" style="display: block; height: auto; border: 0; width: 100%;" width="232" alt="Main Image" title="Main Image" height="auto"></div>
																</div>
														</td>
													</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-top:10px;">
																<div style="color:#ffffff;font-family:'Varela Round', 'Trebuchet MS', Helvetica, sans-serif;font-size:30px;line-height:1.2;text-align:center;mso-line-height-alt:36px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word;">Reset Your Password</span></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#ffffff;font-family:'Varela Round', 'Trebuchet MS', Helvetica, sans-serif;font-size:14px;line-height:1.5;text-align:center;mso-line-height-alt:21px;">
																	<p style="margin: 0; word-break: break-word;">We received a request to reset your password. Don’t worry,</p>
																	<p style="margin: 0; word-break: break-word;">we are here to help you.</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:20px;padding-left:15px;padding-right:15px;padding-top:20px;text-align:center;">
																<div class="alignment" align="center"><a href="{{link}}" target="_blank" style="color:#091548;text-decoration:none;"><!--[if mso]>
	<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:office"  href="{{link}}"  style="height:40px;width:197px;v-text-anchor:middle;" arcsize="60%" fillcolor="#ffffff">
	<v:stroke dashstyle="Solid" weight="0px" color="#ffffff"/>
	<w:anchorlock/>
	<v:textbox inset="0px,0px,0px,0px">
	<center dir="false" style="color:#091548;font-family:sans-serif;font-size:15px">
	<![endif]--><span class="button" style="background-color: #ffffff; mso-shading: transparent; border-bottom: 0px solid transparent; border-left: 0px solid transparent; border-radius: 24px; border-right: 0px solid transparent; border-top: 0px solid transparent; color: #091548; display: inline-block; font-family: 'Varela Round', 'Trebuchet MS', Helvetica, sans-serif; font-size: 15px; font-weight: undefined; mso-border-alt: none; padding-bottom: 5px; padding-top: 5px; padding-left: 25px; padding-right: 25px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word;"><span style="word-break: break-word; line-height: 30px;" data-mce-style><strong>RESET MY PASSWORD</strong></span></span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
													<table class="divider_block block-6" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-left:10px;padding-right:10px;padding-top:10px;">
																<div class="alignment" align="center">
																	<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="60%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																	<tr>
																		<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #5A6BA8;"><span style="word-break: break-word;">&#8202;</span></td>
																	</tr>
																</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-7" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad" style="padding-bottom:10px;padding-left:25px;padding-right:25px;padding-top:10px;">
																<div style="color:#7f96ef;font-family:'Varela Round', 'Trebuchet MS', Helvetica, sans-serif;font-size:14px;line-height:1.5;text-align:center;mso-line-height-alt:21px;">
																	<p style="margin: 0; word-break: break-word;"><strong>Didn’t request a password reset?</strong></p>
																	<p style="margin: 0; word-break: break-word;">You can safely ignore this message.</p>
																</div>
															</td>
														</tr>
													</table>
													<div class="spacer_block block-8" style="height:30px;line-height:30px;font-size:1px;">&#8202;</div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 600px; margin: 0 auto;" width="600">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 15px; padding-left: 10px; padding-right: 10px; padding-top: 15px; vertical-align: top;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<div style="max-width: 145px;"><img src="https://1a5da14deb.imgdist.com/pub/bfra/uqpdfms1/wx7/bcf/n6i/iedc-lbs-logo.png" style="display: block; height: auto; border: 0; width: 100%;" width="145" alt="Your Logo" title="Your Logo" height="auto"></div>
																</div>
														</td>
													</tr>
													</table>
													<table class="divider_block block-2" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad" style="padding-bottom:15px;padding-left:10px;padding-right:10px;padding-top:15px;">
																<div class="alignment" align="center">
																	<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="60%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																		<tr>
																			<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #5A6BA8;"><span style="word-break: break-word;">&#8202;</span></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="social_block block-3" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<table class="social-table" width="72px" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;">
																	<tr>
																			<td style="padding:0 2px 0 2px;"><a href="https://www.instagram.com/lbsiedc/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-white/instagram@2x.png" width="32" height="auto" alt="Instagram" title="Instagram" style="display: block; height: auto; border: 0;"></a></td>
																			<td style="padding:0 2px 0 2px;"><a href="https://www.linkedin.com/company/iedc-lbscek/" target="_blank"><img src="https://app-rsrc.getbee.io/public/resources/social-networks-icon-sets/t-only-logo-white/linkedin@2x.png" width="32" height="auto" alt="LinkedIn" title="LinkedIn" style="display: block; height: auto; border: 0;"></a></td>
																		</tr>
																</table>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-4" width="100%" border="0" cellpadding="15" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#4a60bb;font-family:'Varela Round', 'Trebuchet MS', Helvetica, sans-serif;font-size:12px;line-height:1.2;text-align:center;mso-line-height-alt:14px;">
																	<p style="margin: 0; word-break: break-word;"><span style="word-break: break-word;">Copyright © 2026 IEDC LBSCEK, All rights reserved.<br></span><span style="word-break: break-word;"></span></p>
																</div>
															</td>
														</tr>
													</table>
													<table class="html_block block-5" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div style="font-family:'Varela Round', 'Trebuchet MS', Helvetica, sans-serif;text-align:center;" align="center"><div style="height-top: 20px;">&nbsp;</div></div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
				</td>
			</tr>
		</tbody>
	</table><!-- End -->
</body>

</html>`;

const MAKERSPACE_OTP_HTML = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Makerspace OTP</title>
	</head>
	<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;line-height:1.6;background:#f6f7fb;">
		<div style="max-width:600px;margin:0 auto;padding:24px;">
			<div style="background:#ffffff;border-radius:10px;padding:24px;border:1px solid #e7e9f2;">
				<h2 style="margin:0 0 12px 0;">Makerspace Verification Code</h2>
				<p style="margin:0 0 18px 0;">Use the OTP below to complete your verification:</p>
				<div style="font-size:28px;letter-spacing:6px;font-weight:700;text-align:center;padding:14px 10px;background:#f3f5ff;border-radius:10px;border:1px dashed #c9cffd;">
					{{otp}}
				</div>
				<p style="margin:18px 0 0 0;">This OTP expires in <b>{{expiresMinutes}}</b> minutes.</p>
				<p style="margin:10px 0 0 0;color:#666;">If you didn’t request this, you can ignore this email.</p>
			</div>
			<p style="margin:14px 0 0 0;color:#889; font-size:12px; text-align:center;">IEDC LBSCEK Makerspace</p>
		</div>
	</body>
</html>
`;

const MAKERSPACE_ACCESS_GRANTED_HTML = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Makerspace Access Granted</title>
	</head>
	<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;line-height:1.6;background:#f6f7fb;">
		<div style="max-width:600px;margin:0 auto;padding:24px;">
			<div style="background:#ffffff;border-radius:10px;padding:24px;border:1px solid #e7e9f2;">
				<h2 style="margin:0 0 12px 0;">Your IEDC Makerspace Access Granted</h2>
				<p style="margin:0 0 12px 0;">Welcome{{name}}!</p>
				<p style="margin:0 0 18px 0;">Your registered ID / Access Code is:</p>
				<div style="font-size:20px;font-weight:700;text-align:center;padding:12px 10px;background:#f3f5ff;border-radius:10px;border:1px solid #e7e9f2;">
					{{membershipId}}
				</div>
				<p style="margin:18px 0 0 0;">Use this ID to check-in at the Makerspace entrance.</p>
				<p style="margin:10px 0 0 0;color:#666;">Email: {{email}}</p>
				<p style="margin:10px 0 0 0;color:#666;">User type: {{userType}}</p>
				<p style="margin:10px 0 0 0;color:#666;">Organization: {{organization}}</p>
			</div>
			<p style="margin:14px 0 0 0;color:#889; font-size:12px; text-align:center;">IEDC LBSCEK Makerspace</p>
		</div>
	</body>
</html>
`;

export const seedEmailTemplates = async () => {
  const templatesToSeed = [
    {
      key: "password_reset",
      name: "Password Reset",
      subject: "Reset Your Password",
      html: PASSWORD_RESET_HTML,
      isBase: true,
    },
    {
      key: "makerspace_otp",
      name: "Makerspace OTP",
      subject: "Your Makerspace OTP",
      html: MAKERSPACE_OTP_HTML,
      isBase: true,
    },
    {
      key: "makerspace_access_granted",
      name: "Makerspace Access Granted",
      subject: "Your IEDC Makerspace Access Granted",
      html: MAKERSPACE_ACCESS_GRANTED_HTML,
      isBase: true,
    },
  ];

  for (const t of templatesToSeed) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await EmailTemplate.findOne({ key: t.key });
    if (existing) continue;
    // eslint-disable-next-line no-await-in-loop
    await EmailTemplate.create(t);
  }
};
