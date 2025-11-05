import webpack from 'webpack';
import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

type BuildMode = 'development' | 'production';

interface configProps {
    mode?: BuildMode,
    port?: number
}

export default (env: configProps): webpack.Configuration => {
    
    const isDev = env.mode === 'development';
    const devtool: webpack.Configuration['devtool'] = isDev ? 'inline-source-map' : false;

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
        ],
    }

    return config;
};
