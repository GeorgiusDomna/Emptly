import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

type BuildMode = 'development' | 'production';

interface configProps {
    mode?: BuildMode,
    port?: number
}

function loadClientEnv(): Record<string, string> {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
        return {};
    }

    return fs.readFileSync(envPath, 'utf8')
        .split('\n')
        .reduce<Record<string, string>>((acc, line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return acc;
            }

            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) {
                return acc;
            }

            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            acc[key] = value;
            return acc;
        }, {});
}

export default (env: configProps): webpack.Configuration => {
    
    const isDev = env.mode === 'development';
    const devtool: webpack.Configuration['devtool'] = isDev ? 'inline-source-map' : false;
    const clientEnv = loadClientEnv();
    const backendPort = process.env.BACKEND_PORT ?? clientEnv.BACKEND_PORT ?? '5001';
    const wsUrl = process.env.VITE_WS_URL ?? clientEnv.VITE_WS_URL ?? '';
    const healthUrl = process.env.VITE_HEALTH_URL ?? clientEnv.VITE_HEALTH_URL ?? '';

    const config = {
        mode: env.mode ?? 'development',
        context: path.resolve('src'),
        entry: './main.tsx',
        output: {
            filename: '[name].bundle.[contenthash].js',
            path: path.resolve('dist'),
            publicPath: '/', 
            assetModuleFilename: 'assets/[name].[hash][ext]',
            // clean: true
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: { importLoaders: 1 }
                        },
                        'postcss-loader'
                    ]
                },        
                {
                    // обработаем и .sass и .scss (если вдруг появятся .scss)
                    test: /\.s[ac]ss$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: { importLoaders: 2 } // sass -> postcss -> css
                        },
                        'postcss-loader',
                        'sass-loader'
                    ]
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    type: 'asset/resource'
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx', '.scss', '.sass', '.css'],
            alias: {
                '@': path.resolve('./src')
            }
        },
        devtool,
        devServer: isDev ? {
            port: env.port ?? 3000,
            open: true,
            historyApiFallback: true,
            hot: true,
            static: {
                publicPath: '/',
            }
        } : undefined,
        plugins: [
            new CleanWebpackPlugin(),
            new HtmlWebpackPlugin({
                template: './index.html'
            }),
            new MiniCssExtractPlugin({ 
                filename: 'styles.[contenthash].css'
            }),
            new webpack.DefinePlugin({
                'process.env.BACKEND_PORT': JSON.stringify(backendPort),
                'process.env.VITE_WS_URL': JSON.stringify(wsUrl),
                'process.env.VITE_HEALTH_URL': JSON.stringify(healthUrl),
            }),
        ],
    }

    return config;
};
