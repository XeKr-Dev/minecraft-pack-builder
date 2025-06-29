import {Message as ArcoMessage} from '@arco-design/web-vue'

export class Message {
    public static success(msg: string) {
        ArcoMessage.success(msg)

    }

    public static error(msg: string) {
        ArcoMessage.error(msg)
    }

    public static info(msg: string) {
        ArcoMessage.info(msg)
    }

    public static warning(msg: string) {
        ArcoMessage.warning(msg)
    }

    public static normal(msg: string) {
        ArcoMessage.normal(msg)
    }

    public static loading(msg: string) {
        ArcoMessage.loading(msg)
    }
}
