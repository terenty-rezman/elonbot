# puppeteer setup take from 
# https://github.com/buildkite/docker-puppeteer/blob/master/Dockerfile

FROM node:14

# install chrome
RUN  apt-get update \
     && apt-get install -y wget gnupg ca-certificates \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     # We install Chrome to get all the OS level dependencies, but Chrome itself
     # is not actually used as it's packaged in the node puppeteer library.
     # Alternatively, we could could include the entire dep list ourselves
     # (https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)
     # but that seems too easy to get out of date.
     && apt-get install -y google-chrome-stable \
     && rm -rf /var/lib/apt/lists/*

# Add non root user
RUN groupadd -r user && useradd -r -g user -G audio,video user \
  && mkdir -p /home/user/Downloads \
  && chown -R user:user /home/user

# No usable sandbox workaround 
# https://github.com/puppeteer/puppeteer/issues/3451#issuecomment-523961368
# make sure to start your container with --cap-add=SYS_ADMIN
# WARNING: this might compromise your host security ! or is it...
RUN echo 'kernel.unprivileged_userns_clone=1' > /etc/sysctl.d/userns.conf

ENV APP_DIR=/usr/src/elonbot

WORKDIR $APP_DIR
COPY package*.json ./

# install puppeteer and other deps
RUN npm i
COPY . .
RUN chown -R user:user $APP_DIR

# Run everything after as non-root user.
# chrome fails if run with root
USER user

CMD ["npm", "run", "start"]
