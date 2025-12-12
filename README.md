# WebOTPAuth || Get One Time Auth Code
WebOTPAuthはブラウザ上でGoogle AuthenticatorやMicrosoft Authenticator等で発行できる認証コードを取得できるサイトです。
QRコードをスキャンした際に出るURLのみで確認が可能なため、職場や学校でアプリが使えなかったり拡張機能等がインストールできない際でも認証コードの取得が可能です。
> [!NOTE]
> 認証コードの表示はすべてGoogle Authenticatorなどの認証アプリと同じシステムを採用しているため、管理者がお客様の認証コードを確認できることはありません。
## 使い方
まず、認証アプリを追加する際に表示されるQRコードをスキャンして*otpauth:/XXXXX*等から始まるURLを控えておいてください。
> [!TIP]
> ご使用のブラウザがChromeベースであるなら、Google Camera等でスキャンが可能です。
> [!WARNING]
> totp://XXXXXなどのURLは使用できない可能性があります。更なるアップデートをご期待ください。
サイトに戻ってURLを入力すると、リンクが表示されるはずです。
表示されたリンクをブックマーク等に保存するといつでも確認できます。
