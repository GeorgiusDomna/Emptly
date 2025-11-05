import { IconCirclesRelation } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Link } from "react-router-dom"
import { useState } from "react"

const StartPage = () => {
    const [value, setValue] = useState('iddqq1d232safdf4623d2d21');

    return (
        <Empty className="max-w-[500px] border border-dashed">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <IconCirclesRelation />
                </EmptyMedia>
                <EmptyTitle>Для звонка нужно войти в комнату</EmptyTitle>
                <EmptyDescription>
                    Если у вас есть ссылка - перейдите по ней, если нет - создайте
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row justify-center">
                <Button variant="outline" size="sm" asChild>
                    <Link to="/connect-room/">
                        Перейти по ссылке
                    </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                    <Link to={`/room/${value}/`}>
                        Создать комнату
                    </Link>
                </Button>
            </EmptyContent>
        </Empty>
    )
}


export default StartPage