import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"


export const DialogInput = () => {

    return (
        <Field className="dialogInput rounded-[30px]">
            {/* <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                текст сообщения
            </FieldLabel> */}
            <Input
                id="checkout-7j9-card-name-43j"
                className="h-[60px] rounded-[30px]"
                placeholder="текст сообщения"
                required
            />
        </Field>
    )
}