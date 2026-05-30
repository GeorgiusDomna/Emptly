import * as uuid from 'uuid';
import path from 'path';
import fs from 'fs';

class FileService {
    saveFile(file) {
        try {
            const fileName = uuid.v4() + '.jpeg';
            const folder = path.resolve('static');
            const filePath = path.resolve(folder, fileName);

            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }

            file.mv(filePath);
            return fileName;
        } catch (err) {
            console.log(err)
        }
    }
}

export default new FileService();